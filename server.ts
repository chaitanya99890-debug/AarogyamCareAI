import 'dotenv/config'
// @ts-expect-error cors typings may not be installed in this project.
import cors from 'cors'
// @ts-expect-error Express typings may not be installed in this project.
import express from 'express'
import { GoogleGenAI } from '@google/genai'
import { appendSmsLog, createAppointment, deleteAppointment, isReminder, readAppointments, updateAppointment, type StoredAppointment } from './backend/appointmentStore.ts'
import { AuthenticationError, loginUser, registerUser, requireAdmin, requireAuthenticatedUser } from './backend/auth.ts'
import { getAdminDashboard, getAdminReportAnalysis, getAdminSmsOverview, listAdminAppointments, listAdminPredictions, listAdminReports, listAdminUsers, recordAdminAudit } from './backend/adminStore.ts'
import { deleteChatConversation, getHealthProfile, listChatConversations, listChatMessages, listDiseasePredictions, listReports, listRiskAssessments, saveChatExchange, saveDiseasePrediction, saveHealthProfile, saveReportAnalysis, saveRiskAssessment } from './backend/persistenceStore.ts'
import { startReminderScheduler } from './backend/reminderScheduler.ts'
import { getSmsConfigurationStatus, isE164PhoneNumber, sendSms } from './backend/twilioSmsService.ts'
import { verifyDatabaseConnection } from './database/mysql.ts'

const app = express()
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MAX_REPORT_SIZE_BYTES = 10 * 1024 * 1024
const GEMINI_RETRY_DELAYS_MS = [500, 1_200]
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'

function logGeminiError(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown Gemini error'
  const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : undefined
  const causeMessage = cause instanceof Error ? cause.message : ''
  const causeCode = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : ''

  // Development diagnostics deliberately exclude request content and API keys.
  console.error(`${context}: ${message}${causeCode ? ` [${causeCode}]` : ''}${causeMessage ? ` — ${causeMessage}` : ''}`)
}

const REPORT_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    keyFindings: { type: 'array', items: { type: 'string' } },
    importantValues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['label', 'value'],
      },
    },
    possibleConcerns: { type: 'array', items: { type: 'string' } },
    questionsForDoctor: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'keyFindings', 'importantValues', 'possibleConcerns', 'questionsForDoctor'],
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 10)
    : []
}

function reportAnalysisFromModel(value: unknown) {
  const data = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const importantValues = Array.isArray(data.importantValues)
    ? data.importantValues
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map((item) => ({
          label: typeof item.label === 'string' ? item.label : '',
          value: typeof item.value === 'string' ? item.value : '',
        }))
        .filter((item) => item.label && item.value)
        .slice(0, 10)
    : []

  return {
    summary: typeof data.summary === 'string' ? data.summary.trim() : '',
    keyFindings: stringList(data.keyFindings),
    importantValues,
    possibleConcerns: stringList(data.possibleConcerns),
    questionsForDoctor: stringList(data.questionsForDoctor),
  }
}

function parseJsonObject(text: string | undefined): unknown {
  const trimmed = text?.trim() ?? ''
  if (!trimmed) return {}
  // Some providers return a fenced JSON block even when JSON output was
  // requested. Accept that transport wrapper, then validate the content below.
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(unfenced)
}

function isInvalidArgument(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return /invalid argument|invalid_argument|\b400\b/i.test(message)
}

function isTemporarilyUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return /\b503\b|\bunavailable\b|high demand/i.test(message)
}

function isGeminiRateLimited(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return /\b429\b|resource_exhausted|quota exceeded|rate limit/i.test(message)
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

async function generateWithRetry<T>(request: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request()
    } catch (error) {
      const delay = GEMINI_RETRY_DELAYS_MS[attempt]
      if (delay === undefined || !isTemporarilyUnavailable(error)) throw error
      console.warn(`Gemini is temporarily unavailable; retrying in ${delay} ms.`)
      await wait(delay)
    }
  }
}

async function generateReportAnalysis(mimeType: string, data: string) {
  const contents = [
    {
      role: 'user' as const,
      parts: [
        {
          text: `Review this uploaded health report for educational purposes only. Extract only clearly visible information. Do not diagnose, prescribe treatment, or state that a condition is confirmed. If a value is unclear, say it is unclear rather than guessing. Return JSON with exactly these fields: summary (string), keyFindings (array of strings), importantValues (array of {label, value}), possibleConcerns (array of strings), questionsForDoctor (array of strings).`,
        },
        { inlineData: { mimeType, data } },
      ],
    },
  ]
  const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL
  try {
    const response = await generateWithRetry(() => ai.models.generateContent({
      model,
      contents,
      config: { responseMimeType: 'application/json', responseJsonSchema: REPORT_ANALYSIS_SCHEMA },
    }))
    return reportAnalysisFromModel(parseJsonObject(response.text))
  } catch (error) {
    if (!isInvalidArgument(error)) throw error
    // Some model versions reject JSON Schema while accepting JSON MIME output.
    // Retry once with the same content and validate the returned JSON ourselves.
    console.warn('Gemini structured schema was rejected; retrying with JSON-only output.')
    const response = await generateWithRetry(() => ai.models.generateContent({
      model,
      contents,
      config: { responseMimeType: 'application/json' },
    }))
    return reportAnalysisFromModel(parseJsonObject(response.text))
  }
}

function createAppointmentId() {
  return `appointment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function appointmentFromRequest(body: unknown, existing?: StoredAppointment): { appointment?: StoredAppointment; message?: string } {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const doctor = typeof data.doctor === 'string' ? data.doctor.trim() : ''
  const date = typeof data.date === 'string' ? data.date : ''
  const time = typeof data.time === 'string' ? data.time : ''
  const reminderMessage = typeof data.reminderMessage === 'string' ? data.reminderMessage.trim() : ''
  const patientPhone = typeof data.patientPhone === 'string' ? data.patientPhone.trim() : ''
  const smsConsent = data.smsConsent === true

  if (!doctor || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !isReminder(data.reminder)) {
    return { message: 'Doctor name, date, time, and a valid reminder choice are required.' }
  }

  if (patientPhone && !isE164PhoneNumber(patientPhone)) {
    return { message: 'Use an international patient phone number, for example +919876543210.' }
  }

  if (smsConsent && !patientPhone) {
    return { message: 'Add a patient phone number before enabling SMS reminders.' }
  }

  const now = new Date().toISOString()
  const schedulingChanged = !existing || existing.date !== date || existing.time !== time || existing.reminder !== data.reminder || existing.patientPhone !== patientPhone || existing.smsConsent !== smsConsent || existing.reminderMessage !== reminderMessage
  const status = !patientPhone || !smsConsent
    ? 'not_scheduled'
    : schedulingChanged
      ? 'scheduled'
      : existing.smsStatus

  return {
    appointment: {
      id: existing?.id ?? (typeof data.id === 'string' && data.id.trim() ? data.id.trim() : createAppointmentId()),
      doctor,
      date,
      time,
      reminder: data.reminder,
      reminderMessage,
      patientPhone,
      smsConsent,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      smsStatus: status,
      ...(schedulingChanged ? {} : {
        smsSentAt: existing.smsSentAt,
        smsLastAttemptAt: existing.smsLastAttemptAt,
        smsLastError: existing.smsLastError,
        smsSid: existing.smsSid,
        smsProviderStatus: existing.smsProviderStatus,
      }),
    },
  }
}

app.use(
  cors({
    origin: true,
  }),
)
app.use(express.json({ limit: '15mb' }))

app.get('/api/health', async (_req: any, res: any) => {
  try {
    await verifyDatabaseConnection()
    return res.json({ status: 'ok', database: 'ready' })
  } catch (error) {
    console.error('Database health check failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ status: 'degraded', message: 'Database is unavailable.' })
  }
})

app.post('/api/auth/register', async (req: any, res: any) => {
  try {
    const result = await registerUser({
      name: typeof req.body.name === 'string' ? req.body.name : '',
      email: typeof req.body.email === 'string' ? req.body.email : '',
      password: typeof req.body.password === 'string' ? req.body.password : '',
      dateOfBirth: typeof req.body.dateOfBirth === 'string' ? req.body.dateOfBirth : undefined,
      gender: typeof req.body.gender === 'string' ? req.body.gender : undefined,
      phone: typeof req.body.phone === 'string' ? req.body.phone : undefined,
    })
    return res.status(201).json({ user: { id: result.user.publicId, name: result.user.name, email: result.user.email, role: result.user.role }, token: result.token })
  } catch (error: any) {
    if (error instanceof AuthenticationError) return res.status(400).json({ message: error.message })
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'An account with this email already exists.' })
    console.error('Registration failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Account service is temporarily unavailable.' })
  }
})

app.post('/api/auth/login', async (req: any, res: any) => {
  try {
    const result = await loginUser(typeof req.body.email === 'string' ? req.body.email : '', typeof req.body.password === 'string' ? req.body.password : '', 'user')
    return res.json({ user: { id: result.user.publicId, name: result.user.name, email: result.user.email, role: result.user.role }, token: result.token })
  } catch (error) {
    if (error instanceof AuthenticationError) return res.status(401).json({ message: 'Incorrect email or password.' })
    console.error('Login failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Account service is temporarily unavailable.' })
  }
})

app.post('/api/auth/admin/login', async (req: any, res: any) => {
  try {
    const result = await loginUser(typeof req.body.email === 'string' ? req.body.email : '', typeof req.body.password === 'string' ? req.body.password : '', 'admin')
    return res.json({ user: { id: result.user.publicId, name: result.user.name, email: result.user.email, role: result.user.role }, token: result.token })
  } catch (error) {
    if (error instanceof AuthenticationError) return res.status(401).json({ message: 'Incorrect email or password.' })
    console.error('Admin login failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Account service is temporarily unavailable.' })
  }
})

app.post('/api/auth/forgot-password', (_req: any, res: any) => {
  // Email delivery is intentionally not claimed until a mail provider is configured.
  return res.status(204).end()
})

app.get('/api/appointments', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    return res.json({ appointments: await readAppointments(user.id) })
  } catch (error) {
    console.error('Could not load appointments:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ message: 'Unable to load appointments right now.' })
  }
})

app.post('/api/appointments', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  const result = appointmentFromRequest(req.body)
  if (!result.appointment) return res.status(400).json({ message: result.message })

  try {
    const existing = (await readAppointments(user.id)).find((appointment) => appointment.id === result.appointment?.id)
    if (existing) {
      const updated = appointmentFromRequest(req.body, existing)
      if (!updated.appointment) return res.status(400).json({ message: updated.message })
      return res.json({ appointment: await updateAppointment(user.id, updated.appointment) })
    }
    return res.status(201).json({ appointment: await createAppointment(user.id, result.appointment) })
  } catch (error) {
    console.error('Could not save appointment:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ message: 'Unable to save the appointment right now.' })
  }
})

app.put('/api/appointments/:id', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    const appointments = await readAppointments(user.id)
    const index = appointments.findIndex((appointment) => appointment.id === req.params.id)
    if (index < 0) return res.status(404).json({ message: 'Appointment not found.' })

    const result = appointmentFromRequest(req.body, appointments[index])
    if (!result.appointment) return res.status(400).json({ message: result.message })
    const updated = await updateAppointment(user.id, result.appointment)
    return res.json({ appointment: updated })
  } catch (error) {
    console.error('Could not update appointment:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ message: 'Unable to update the appointment right now.' })
  }
})

app.delete('/api/appointments/:id', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    if (!(await deleteAppointment(user.id, req.params.id))) return res.status(404).json({ message: 'Appointment not found.' })
    return res.json({ success: true })
  } catch (error) {
    console.error('Could not delete appointment:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ message: 'Unable to delete the appointment right now.' })
  }
})

app.get('/api/sms/status', (_req: any, res: any) => {
  return res.json(getSmsConfigurationStatus())
})

async function sendAdminSmsTest(req: any, res: any, user: { id: bigint }) {
  const to = typeof req.body.to === 'string' ? req.body.to.trim() : ''
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : ''
  if (!isE164PhoneNumber(to)) return res.status(400).json({ message: 'Use a phone number in international format, for example +919876543210.' })
  if (!message || message.length > 500) return res.status(400).json({ message: 'Enter an SMS message of up to 500 characters.' })
  const result = await sendSms(to, message)
  await appendSmsLog({ createdAt: new Date().toISOString(), event: result.success ? 'test_sent' : 'test_failed', sid: result.sid, status: result.status, error: result.error })
  await recordAdminAudit(user.id, result.success ? 'sms_test_sent' : 'sms_test_failed', 'sms', undefined, { outcome: result.success ? 'accepted' : 'rejected', providerStatus: result.status ?? null, errorCode: result.errorCode ?? null })
  if (!result.success) {
    return res.status(502).json({ success: false, message: result.error })
  }
  return res.json({ success: true, sid: result.sid, status: result.status, usedTrialTemplate: result.usedTrialTemplate, message: result.usedTrialTemplate ? 'Test SMS accepted by Twilio using its trial appointment-reminder template.' : 'Test SMS accepted by Twilio.' })
}

app.get('/api/admin/dashboard', async (req: any, res: any) => {
  if (!await requireAdmin(req, res)) return
  try { return res.json(await getAdminDashboard()) } catch (error) {
    console.error('Could not load admin dashboard:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Admin dashboard data is temporarily unavailable.' })
  }
})

app.get('/api/admin/users', async (req: any, res: any) => {
  if (!await requireAdmin(req, res)) return
  try { return res.json(await listAdminUsers({ search: typeof req.query.search === 'string' ? req.query.search : '', role: typeof req.query.role === 'string' ? req.query.role : '', page: Number(req.query.page), pageSize: Number(req.query.pageSize) })) } catch (error) {
    console.error('Could not load admin users:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'User administration data is temporarily unavailable.' })
  }
})

app.get('/api/admin/appointments', async (req: any, res: any) => {
  if (!await requireAdmin(req, res)) return
  try { return res.json({ appointments: await listAdminAppointments() }) } catch (error) {
    console.error('Could not load admin appointments:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Appointment administration data is temporarily unavailable.' })
  }
})

app.get('/api/admin/reports', async (req: any, res: any) => {
  if (!await requireAdmin(req, res)) return
  try { return res.json({ reports: await listAdminReports() }) } catch (error) {
    console.error('Could not load admin reports:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Report administration data is temporarily unavailable.' })
  }
})

app.get('/api/admin/reports/:id/analysis', async (req: any, res: any) => {
  if (!await requireAdmin(req, res)) return
  try {
    const report = await getAdminReportAnalysis(req.params.id)
    if (!report) return res.status(404).json({ message: 'Report analysis not found.' })
    return res.json(report)
  } catch (error) {
    console.error('Could not load admin report analysis:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Report analysis is temporarily unavailable.' })
  }
})

app.get('/api/admin/predictions', async (req: any, res: any) => {
  if (!await requireAdmin(req, res)) return
  try { return res.json(await listAdminPredictions()) } catch (error) {
    console.error('Could not load admin predictions:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Prediction administration data is temporarily unavailable.' })
  }
})

app.get('/api/admin/sms/status', async (req: any, res: any) => {
  if (!await requireAdmin(req, res)) return
  try { return res.json({ ...getSmsConfigurationStatus(), reminders: await getAdminSmsOverview() }) } catch (error) {
    console.error('Could not load admin SMS status:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'SMS administration data is temporarily unavailable.' })
  }
})

app.post('/api/admin/sms/test', async (req: any, res: any) => {
  const user = await requireAdmin(req, res)
  if (!user) return
  try { return await sendAdminSmsTest(req, res, user) } catch (error) {
    console.error('Admin SMS test failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'The SMS service is temporarily unavailable.' })
  }
})

app.post('/api/sms/test', async (req: any, res: any) => {
  const user = await requireAdmin(req, res)
  if (!user) return
  return sendAdminSmsTest(req, res, user)
})

app.get('/api/health-profile', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    return res.json(await getHealthProfile(user.id))
  } catch (error) {
    console.error('Could not load health profile:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Unable to load your health profile right now.' })
  }
})

app.put('/api/health-profile', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    return res.json(await saveHealthProfile(user.id, req.body && typeof req.body === 'object' ? req.body : {}))
  } catch (error) {
    console.error('Could not save health profile:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Unable to save your health profile right now.' })
  }
})

app.get('/api/reports', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    return res.json({ reports: await listReports(user.id) })
  } catch (error) {
    console.error('Could not load reports:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Unable to load reports right now.' })
  }
})

app.post('/api/reports', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  // Reports remain client-selected/transient; this route stores metadata only, never file content.
  try {
    const input = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {}
    const fileName = typeof input.fileName === 'string' ? input.fileName : ''
    const mimeType = typeof input.mimeType === 'string' ? input.mimeType : ''
    const fileSize = typeof input.fileSize === 'number' ? input.fileSize : 0
    if (!fileName || !mimeType || fileSize < 0) return res.status(400).json({ message: 'Valid report metadata is required.' })
    const id = await createReportMetadata(user.id, { fileName, mimeType, fileSize })
    return res.status(201).json({ id, name: fileName })
  } catch (error) {
    console.error('Could not save report metadata:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Unable to save report metadata right now.' })
  }
})

app.post('/api/disease-predictions', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    await saveDiseasePrediction(user.id, req.body && typeof req.body === 'object' ? req.body : {})
    return res.status(201).json({ success: true })
  } catch (error) {
    console.error('Could not save disease prediction:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Unable to save prediction history right now.' })
  }
})

app.get('/api/disease-predictions', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    return res.json({ predictions: await listDiseasePredictions(user.id) })
  } catch (error) {
    console.error('Could not load disease predictions:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Unable to load prediction history right now.' })
  }
})

app.post('/api/risk-assessments', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    await saveRiskAssessment(user.id, req.body && typeof req.body === 'object' ? req.body : {})
    return res.status(201).json({ success: true })
  } catch (error) {
    console.error('Could not save risk assessment:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Unable to save risk history right now.' })
  }
})

app.get('/api/risk-assessments', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    return res.json({ assessments: await listRiskAssessments(user.id) })
  } catch (error) {
    console.error('Could not load risk assessments:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Unable to load risk history right now.' })
  }
})

app.get('/api/chat/conversations', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    return res.json({ conversations: await listChatConversations(user.id) })
  } catch (error) {
    console.error('Could not load chat conversations:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Unable to load chat history right now.' })
  }
})

app.get('/api/chat/conversations/:id/messages', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    return res.json({ messages: await listChatMessages(user.id, req.params.id) })
  } catch (error) {
    console.error('Could not load chat messages:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Unable to load chat messages right now.' })
  }
})

app.delete('/api/chat/conversations/:id', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  try {
    if (!(await deleteChatConversation(user.id, req.params.id))) return res.status(404).json({ message: 'Conversation not found.' })
    return res.json({ success: true })
  } catch (error) {
    console.error('Could not delete chat conversation:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ message: 'Unable to delete chat history right now.' })
  }
})

app.post('/api/chat', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : ''
  const chatId = typeof req.body.chatId === 'string' && req.body.chatId.trim() ? req.body.chatId.trim().slice(0, 64) : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  if (!message) {
    return res.status(400).json({ message: 'A message is required.' })
  }

  // Test-only seam: when explicitly configured, avoid live Gemini calls and return
  // deterministic text. Production behavior is unchanged because this is unset.
  const mockedReply = process.env.MOCK_GEMINI_RESPONSE?.trim()

  if (!mockedReply && !process.env.GEMINI_API_KEY) {
    console.error('Gemini is not configured: GEMINI_API_KEY is missing.')
    return res.status(503).json({ message: 'AI service is not configured.' })
  }

  try {
    const reply = mockedReply ?? (await generateWithRetry(() => ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
      contents: message,
      config: {
        systemInstruction: `You are AarogyamCare AI, a warm and reliable health-information assistant.

Answer the user's latest question directly and completely. Do not write as if you are continuing a previous answer, do not say "as mentioned above", and never leave a response unfinished.

Write every response in polished Markdown that is easy to scan:
- Start with the answer or recommendation; do not repeat the question.
- Keep simple questions concise. For longer answers, use descriptive ## or ### headings, short paragraphs, and whitespace.
- Use **bold** for key conclusions, bullet lists for related points, and numbered lists for procedures.
- Use a Markdown table only when comparing options or specifications makes the answer clearer.
- For technical questions, put code in fenced blocks with the correct language and use inline code for commands, APIs, and filenames.
- Do not use a wall of text. Do not add unnecessary introductions, repetition, or a generic closing question.
- Use emojis only when they clearly improve a warning, tip, or recommendation.
- Match the user's language and tone. Never invent facts, sources, links, statistics, or citations.

Provide general health information only; do not diagnose or claim certainty about a condition. Encourage urgent medical care or local emergency services for severe, sudden, or life-threatening symptoms.`,
      },
    }))).text?.trim()

    if (!reply) {
      return res.status(502).json({ message: 'The AI returned no response.' })
    }

    try {
      await saveChatExchange(user.id, chatId, message, reply)
    } catch (error) {
      // Gemini's answer is still useful; database details stay on the server.
      console.error('Could not persist chat exchange:', error instanceof Error ? error.message : 'Unknown error')
    }
    return res.json({ reply, chatId })
  } catch (error) {
    logGeminiError('Gemini chat request failed', error)
    const unavailable = isTemporarilyUnavailable(error) || isGeminiRateLimited(error)
    return res.status(unavailable ? 503 : 502).json({ message: unavailable ? 'The AI service is temporarily busy. Please try again in a moment.' : 'Unable to get an AI response right now.' })
  }
})

app.post('/api/reports/analyze', async (req: any, res: any) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return
  const mimeType = typeof req.body.mimeType === 'string' ? req.body.mimeType : ''
  const data = typeof req.body.data === 'string' ? req.body.data : ''
  const fileName = typeof req.body.fileName === 'string' ? req.body.fileName : 'report'
  const allowedMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg'])

  if (!allowedMimeTypes.has(mimeType) || !data) {
    return res.status(400).json({ message: 'Please upload a PDF, PNG, or JPG report.' })
  }

  if (Buffer.byteLength(data, 'base64') > MAX_REPORT_SIZE_BYTES) {
    return res.status(413).json({ message: 'Please choose a report smaller than 10 MB.' })
  }

  // Test-only seam: test mode returns fixed structured data and never sends the
  // uploaded content to Gemini. Normal behavior is unchanged when unset.
  const mockedAnalysis = process.env.MOCK_REPORT_ANALYSIS === 'true'
    ? {
        summary: 'Mock report summary for automated testing only.',
        keyFindings: ['Mock key finding'],
        importantValues: [{ label: 'Mock value', value: 'Test value' }],
        possibleConcerns: ['Discuss mock result with a qualified clinician.'],
        questionsForDoctor: ['What follow-up is appropriate for this result?'],
      }
    : undefined

  if (!mockedAnalysis && !process.env.GEMINI_API_KEY) {
    console.error('Gemini is not configured: GEMINI_API_KEY is missing.')
    return res.status(503).json({ message: 'AI service is not configured. Add GEMINI_API_KEY to .env, then restart the server.' })
  }

  try {
    const analysis = mockedAnalysis ?? await generateReportAnalysis(mimeType, data)

    if (!analysis.summary) {
      return res.status(502).json({ message: 'The AI returned an incomplete report analysis.' })
    }
    try {
      await saveReportAnalysis(user.id, {
        fileName,
        mimeType,
        fileSize: Buffer.byteLength(data, 'base64'),
        analysis,
        modelName: mockedAnalysis ? 'mock-report-analysis' : (process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL),
      })
    } catch (error) {
      console.error('Could not persist report analysis:', error instanceof Error ? error.message : 'Unknown error')
    }
    return res.json(analysis)
  } catch (error) {
    logGeminiError('Gemini report-analysis request failed', error)
    return res.status(502).json({ message: 'Unable to analyze this report right now. Please try again.' })
  }
})

const port = Number.parseInt(process.env.PORT ?? '', 10) || 3000

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`)
  startReminderScheduler()
})
