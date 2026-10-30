import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { getDatabasePool } from '../../../../database/connection/mysql.ts'

function text(value: unknown, max = 10000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function getHealthProfile(userId: bigint) {
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
    `SELECT u.name, COALESCE(DATE_FORMAT(u.date_of_birth, '%Y-%m-%d'), '') AS dateOfBirth,
            COALESCE(u.gender, '') AS gender, COALESCE(h.blood_group, '') AS bloodGroup,
            COALESCE(h.height, '') AS height, COALESCE(h.weight, '') AS weight,
            COALESCE(h.allergies, '') AS allergies, COALESCE(h.existing_conditions, '') AS conditions,
            COALESCE(h.medications, '') AS medications,
            COALESCE(h.emergency_contact_name, '') AS emergencyContactName,
            COALESCE(h.emergency_contact_phone, '') AS emergencyContactPhone
       FROM users u LEFT JOIN health_profiles h ON h.user_id = u.id WHERE u.id = ?`,
    [userId.toString()],
  )
  return rows[0]
}

export async function saveHealthProfile(userId: bigint, profile: Record<string, unknown>) {
  const name = text(profile.name, 120)
  await getDatabasePool().execute(
    'UPDATE users SET name = ?, date_of_birth = ?, gender = ? WHERE id = ?',
    [name, text(profile.dateOfBirth, 10) || null, text(profile.gender, 32) || null, userId.toString()],
  )
  await getDatabasePool().execute(
    `INSERT INTO health_profiles (user_id, blood_group, height, weight, allergies, existing_conditions, medications, emergency_contact_name, emergency_contact_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE blood_group = VALUES(blood_group), height = VALUES(height), weight = VALUES(weight),
       allergies = VALUES(allergies), existing_conditions = VALUES(existing_conditions), medications = VALUES(medications),
       emergency_contact_name = VALUES(emergency_contact_name), emergency_contact_phone = VALUES(emergency_contact_phone)`,
    [userId.toString(), text(profile.bloodGroup, 16) || null, text(profile.height, 32) || null, text(profile.weight, 32) || null,
      text(profile.allergies) || null, text(profile.conditions) || null, text(profile.medications) || null,
      text(profile.emergencyContactName, 120) || null, text(profile.emergencyContactPhone, 24) || null],
  )
  return getHealthProfile(userId)
}

function conversationTitle(message: string) {
  const clean = message.replace(/\s+/g, ' ').trim()
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean || 'New conversation'
}

async function conversationId(userId: bigint, publicId: string, firstMessage: string): Promise<bigint> {
  const pool = getDatabasePool()
  const [existing] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM chat_conversations WHERE user_id = ? AND public_id = ? LIMIT 1', [userId.toString(), publicId],
  )
  if (existing[0]) return BigInt(existing[0].id)
  const [created] = await pool.execute<ResultSetHeader>(
    'INSERT INTO chat_conversations (public_id, user_id, title) VALUES (?, ?, ?)', [publicId, userId.toString(), conversationTitle(firstMessage)],
  )
  return BigInt(created.insertId)
}

export async function saveChatExchange(userId: bigint, publicId: string, message: string, reply: string) {
  const pool = getDatabasePool()
  const id = await conversationId(userId, publicId, message)
  await pool.execute('INSERT INTO chat_messages (conversation_id, role, message) VALUES (?, ?, ?), (?, ?, ?)',
    [id.toString(), 'user', message, id.toString(), 'assistant', reply])
  await pool.execute('UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id.toString()])
}

export async function listChatConversations(userId: bigint) {
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
    `SELECT c.public_id AS id, c.title, c.updated_at AS updatedAt,
       COALESCE((SELECT m.message FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1), '') AS preview
       FROM chat_conversations c WHERE c.user_id = ? ORDER BY c.updated_at DESC`, [userId.toString()],
  )
  return rows.map((row) => ({ id: String(row.id), title: String(row.title), preview: String(row.preview), updatedAt: new Date(row.updatedAt).toISOString(), messages: [] }))
}

export async function listChatMessages(userId: bigint, publicId: string) {
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
    `SELECT m.id, m.role, m.message AS content, m.created_at AS timestamp
       FROM chat_messages m JOIN chat_conversations c ON c.id = m.conversation_id
      WHERE c.user_id = ? AND c.public_id = ? ORDER BY m.id`, [userId.toString(), publicId],
  )
  return rows.map((row) => ({ id: String(row.id), role: row.role, content: String(row.content), timestamp: new Date(row.timestamp).toISOString() }))
}

export async function deleteChatConversation(userId: bigint, publicId: string) {
  const [result] = await getDatabasePool().execute<ResultSetHeader>(
    'DELETE FROM chat_conversations WHERE user_id = ? AND public_id = ?', [userId.toString(), publicId],
  )
  return result.affectedRows > 0
}

export async function saveDiseasePrediction(userId: bigint, value: Record<string, unknown>) {
  await getDatabasePool().execute(
    'INSERT INTO disease_predictions (user_id, prediction, confidence, symptoms_json, model_name) VALUES (?, ?, ?, ?, ?)',
    [userId.toString(), text(value.prediction, 160), typeof value.confidence === 'number' ? value.confidence : null,
      JSON.stringify(Array.isArray(value.symptoms) ? value.symptoms.filter((item) => typeof item === 'string').slice(0, 30) : []),
      text(value.modelName, 120) || null],
  )
}

export async function listDiseasePredictions(userId: bigint) {
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
    `SELECT id, prediction, confidence, symptoms_json AS symptoms, model_name AS modelName, created_at AS createdAt
       FROM disease_predictions WHERE user_id = ? ORDER BY created_at DESC`, [userId.toString()],
  )
  return rows.map((row) => ({ ...row, id: String(row.id), symptoms: typeof row.symptoms === 'string' ? JSON.parse(row.symptoms) : row.symptoms }))
}

export async function saveRiskAssessment(userId: bigint, value: Record<string, unknown>) {
  await getDatabasePool().execute(
    'INSERT INTO risk_assessments (user_id, risk_result, probability, input_data_json, model_name) VALUES (?, ?, ?, ?, ?)',
    [userId.toString(), text(value.riskResult, 64), typeof value.probability === 'number' ? value.probability : null,
      JSON.stringify(value.inputData && typeof value.inputData === 'object' ? value.inputData : {}), text(value.modelName, 120) || null],
  )
}

export async function listRiskAssessments(userId: bigint) {
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
    `SELECT id, risk_result AS riskResult, probability, input_data_json AS inputData, model_name AS modelName, created_at AS createdAt
       FROM risk_assessments WHERE user_id = ? ORDER BY created_at DESC`, [userId.toString()],
  )
  return rows.map((row) => ({ ...row, id: String(row.id), inputData: typeof row.inputData === 'string' ? JSON.parse(row.inputData) : row.inputData }))
}

export async function createReportMetadata(userId: bigint, input: { fileName: string; mimeType: string; fileSize: number }) {
  const [result] = await getDatabasePool().execute<ResultSetHeader>(
    'INSERT INTO medical_reports (user_id, original_filename, file_type, file_size) VALUES (?, ?, ?, ?)',
    [userId.toString(), text(input.fileName, 255) || 'report', text(input.mimeType, 100), Math.max(0, Math.trunc(input.fileSize))],
  )
  return String(result.insertId)
}

export async function saveReportAnalysis(userId: bigint, input: { fileName: string; mimeType: string; fileSize: number; analysis: unknown; modelName: string }) {
  const reportId = await createReportMetadata(userId, input)
  const analysis = input.analysis && typeof input.analysis === 'object' ? input.analysis : {}
  const summary = text((analysis as Record<string, unknown>).summary)
  await getDatabasePool().execute(
    'INSERT INTO report_analyses (report_id, analysis_text, analysis_json, model_name) VALUES (?, ?, ?, ?)',
    [reportId, summary, JSON.stringify(analysis), text(input.modelName, 120) || null],
  )
  await getDatabasePool().execute('UPDATE medical_reports SET status = ? WHERE id = ?', ['analyzed', reportId])
  return reportId
}

export async function listReports(userId: bigint) {
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
    `SELECT id, original_filename AS name, uploaded_at AS uploadedAt, status, file_type AS type
       FROM medical_reports WHERE user_id = ? ORDER BY uploaded_at DESC`, [userId.toString()],
  )
  return rows.map((row) => ({ id: String(row.id), name: String(row.name), uploadedAt: new Date(row.uploadedAt).toISOString(), status: String(row.status), type: String(row.type) }))
}
