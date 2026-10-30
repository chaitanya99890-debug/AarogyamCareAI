import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { getDatabasePool } from '../../../../database/connection/mysql.ts'

const MAX_PAGE_SIZE = 100

function date(value: unknown): string {
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

export async function getAdminDashboard() {
  const pool = getDatabasePool()
  const [[counts]] = await pool.query<RowDataPacket[]>(`
    SELECT
      (SELECT COUNT(*) FROM users) AS totalUsers,
      (SELECT COUNT(*) FROM appointments) AS totalAppointments,
      (SELECT COUNT(*) FROM appointments WHERE CONCAT(appointment_date, ' ', appointment_time) >= NOW()) AS upcomingAppointments,
      (SELECT COUNT(*) FROM appointments WHERE CONCAT(appointment_date, ' ', appointment_time) < NOW()) AS pastAppointments,
      (SELECT COUNT(*) FROM disease_predictions) AS diseasePredictions,
      (SELECT COUNT(*) FROM risk_assessments) AS riskAssessments,
      (SELECT COUNT(*) FROM report_analyses) AS reportsAnalyzed
  `)
  const [recentUsers] = await pool.query<RowDataPacket[]>('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5')
  const [recentAppointments] = await pool.query<RowDataPacket[]>(`
    SELECT a.public_id AS id, a.doctor, a.appointment_date AS date, a.appointment_time AS time, a.sms_status AS smsStatus,
           u.name AS userName, u.email AS userEmail
      FROM appointments a JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC LIMIT 5`)
  return {
    counts: Object.fromEntries(Object.entries(counts ?? {}).map(([key, value]) => [key, Number(value ?? 0)])),
    recentUsers: recentUsers.map((row) => ({ id: String(row.id), name: String(row.name), email: String(row.email), role: String(row.role), createdAt: date(row.created_at) })),
    recentAppointments: recentAppointments.map((row) => ({ id: String(row.id), doctor: String(row.doctor), date: String(row.date), time: String(row.time).slice(0, 5), smsStatus: String(row.smsStatus), userName: String(row.userName), userEmail: String(row.userEmail) })),
  }
}

export async function listAdminUsers(input: { search?: string; role?: string; page?: number; pageSize?: number }) {
  const search = input.search?.trim().slice(0, 120) ?? ''
  const role = input.role === 'admin' || input.role === 'user' ? input.role : ''
  const pageSize = Math.min(Math.max(Number(input.pageSize) || 20, 1), MAX_PAGE_SIZE)
  const page = Math.max(Number(input.page) || 1, 1)
  const conditions: string[] = []
  const parameters: (string | number)[] = []
  if (search) { conditions.push('(name LIKE ? OR email LIKE ?)'); parameters.push(`%${search}%`, `%${search}%`) }
  if (role) { conditions.push('role = ?'); parameters.push(role) }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const pool = getDatabasePool()
  const [[totalRow]] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM users ${where}`, parameters)
  const [rows] = await pool.execute<RowDataPacket[]>(`SELECT id, name, email, role, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...parameters, pageSize, (page - 1) * pageSize])
  return { total: Number(totalRow?.total ?? 0), page, pageSize, users: rows.map((row) => ({ id: String(row.id), name: String(row.name), email: String(row.email), role: String(row.role), createdAt: date(row.created_at) })) }
}

export async function listAdminAppointments() {
  const [rows] = await getDatabasePool().query<RowDataPacket[]>(`
    SELECT a.public_id AS id, a.doctor, a.appointment_date AS date, a.appointment_time AS time, a.reminder,
           a.sms_status AS smsStatus, a.sms_last_error AS smsLastError, a.created_at AS createdAt,
           u.name AS userName, u.email AS userEmail
      FROM appointments a JOIN users u ON u.id = a.user_id
     ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 250`)
  return rows.map((row) => ({ id: String(row.id), doctor: String(row.doctor), date: String(row.date), time: String(row.time).slice(0, 5), reminder: String(row.reminder), smsStatus: String(row.smsStatus), smsLastError: row.smsLastError ? String(row.smsLastError) : undefined, userName: String(row.userName), userEmail: String(row.userEmail), createdAt: date(row.createdAt) }))
}

export async function listAdminReports() {
  const [rows] = await getDatabasePool().query<RowDataPacket[]>(`
    SELECT r.id, r.original_filename AS name, r.file_type AS type, r.file_size AS size, r.status, r.uploaded_at AS uploadedAt,
           u.name AS userName, u.email AS userEmail, ra.analysis_text AS analysisSummary
      FROM medical_reports r JOIN users u ON u.id = r.user_id
      LEFT JOIN report_analyses ra ON ra.report_id = r.id
     ORDER BY r.uploaded_at DESC LIMIT 250`)
  return rows.map((row) => ({ id: String(row.id), name: String(row.name), type: String(row.type), size: Number(row.size), status: String(row.status), uploadedAt: date(row.uploadedAt), userName: String(row.userName), userEmail: String(row.userEmail), analysisSummary: row.analysisSummary ? String(row.analysisSummary) : undefined }))
}

export async function getAdminReportAnalysis(id: string) {
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(`
    SELECT r.id, r.original_filename AS name, ra.analysis_json AS analysis
      FROM medical_reports r JOIN report_analyses ra ON ra.report_id = r.id WHERE r.id = ? LIMIT 1`, [id])
  const row = rows[0]
  if (!row) return undefined
  return { id: String(row.id), name: String(row.name), analysis: typeof row.analysis === 'string' ? JSON.parse(row.analysis) : row.analysis }
}

export async function listAdminPredictions() {
  const pool = getDatabasePool()
  const [disease] = await pool.query<RowDataPacket[]>(`
    SELECT d.id, d.prediction, d.confidence, d.symptoms_json AS symptoms, d.model_name AS modelName, d.created_at AS createdAt,
           u.name AS userName, u.email AS userEmail
      FROM disease_predictions d JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC LIMIT 250`)
  const [risk] = await pool.query<RowDataPacket[]>(`
    SELECT r.id, r.risk_result AS riskResult, r.probability, r.model_name AS modelName, r.created_at AS createdAt,
           u.name AS userName, u.email AS userEmail
      FROM risk_assessments r JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC LIMIT 250`)
  return {
    disease: disease.map((row) => ({ id: String(row.id), prediction: String(row.prediction), confidence: row.confidence === null ? null : Number(row.confidence), symptoms: typeof row.symptoms === 'string' ? JSON.parse(row.symptoms) : row.symptoms, modelName: row.modelName ? String(row.modelName) : null, createdAt: date(row.createdAt), userName: String(row.userName), userEmail: String(row.userEmail) })),
    risk: risk.map((row) => ({ id: String(row.id), riskResult: String(row.riskResult), probability: row.probability === null ? null : Number(row.probability), modelName: row.modelName ? String(row.modelName) : null, createdAt: date(row.createdAt), userName: String(row.userName), userEmail: String(row.userEmail) })),
  }
}

export async function getAdminSmsOverview() {
  const [[counts]] = await getDatabasePool().query<RowDataPacket[]>(`
    SELECT
      SUM(sms_status = 'scheduled') AS scheduled,
      SUM(sms_status = 'sent') AS sent,
      SUM(sms_status = 'failed') AS failed,
      SUM(sms_status = 'sending') AS sending
    FROM appointments`)
  return Object.fromEntries(Object.entries(counts ?? {}).map(([key, value]) => [key, Number(value ?? 0)]))
}

export async function recordAdminAudit(adminUserId: bigint, action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) {
  await getDatabasePool().execute<ResultSetHeader>(
    'INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [adminUserId.toString(), action.slice(0, 120), entityType.slice(0, 80), entityId?.slice(0, 128) ?? null, details ? JSON.stringify(details) : null],
  )
}
