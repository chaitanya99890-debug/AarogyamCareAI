import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { getDatabasePool } from '../database/mysql.ts'

export type AppointmentReminder = '15m' | '30m' | '1h' | '1d' | '2d'
export type SmsStatus = 'not_scheduled' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'skipped'

export interface StoredAppointment {
  id: string
  doctor: string
  date: string
  time: string
  reminder: AppointmentReminder
  reminderMessage: string
  patientPhone: string
  smsConsent: boolean
  createdAt: string
  updatedAt: string
  smsStatus: SmsStatus
  smsSentAt?: string
  smsLastAttemptAt?: string
  smsLastError?: string
  smsSid?: string
  smsProviderStatus?: string
}

export interface SmsDeliveryLog {
  appointmentId?: string
  createdAt: string
  event: 'sent' | 'failed' | 'skipped' | 'test_sent' | 'test_failed'
  sid?: string
  status?: string
  error?: string
}

function iso(value: unknown): string | undefined {
  if (!value) return undefined
  const date = new Date(String(value).replace(' ', 'T') + (String(value).includes('T') ? '' : 'Z'))
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function fromRow(row: RowDataPacket): StoredAppointment {
  return {
    id: String(row.public_id), doctor: String(row.doctor), date: String(row.appointment_date),
    time: String(row.appointment_time).slice(0, 5), reminder: row.reminder as AppointmentReminder,
    reminderMessage: String(row.reminder_message), patientPhone: String(row.patient_phone), smsConsent: Boolean(row.sms_consent),
    createdAt: iso(row.created_at) ?? new Date().toISOString(), updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
    smsStatus: row.sms_status as SmsStatus, smsSentAt: iso(row.sms_sent_at), smsLastAttemptAt: iso(row.sms_last_attempt_at),
    smsLastError: row.sms_last_error ? String(row.sms_last_error) : undefined, smsSid: row.sms_sid ? String(row.sms_sid) : undefined,
    smsProviderStatus: row.sms_provider_status ? String(row.sms_provider_status) : undefined,
  }
}

const SELECT_APPOINTMENTS = `SELECT public_id, doctor, appointment_date, appointment_time, reminder, reminder_message,
  patient_phone, sms_consent, sms_status, sms_sent_at, sms_last_attempt_at, sms_last_error, sms_sid, sms_provider_status,
  created_at, updated_at FROM appointments`

export async function readAppointments(userId?: bigint): Promise<StoredAppointment[]> {
  const sql = userId ? `${SELECT_APPOINTMENTS} WHERE user_id = ? ORDER BY appointment_date, appointment_time` : `${SELECT_APPOINTMENTS} ORDER BY appointment_date, appointment_time`
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(sql, userId ? [userId.toString()] : [])
  return rows.map(fromRow)
}

export async function createAppointment(userId: bigint, appointment: StoredAppointment): Promise<StoredAppointment> {
  await getDatabasePool().execute(
    `INSERT INTO appointments (public_id, user_id, doctor, appointment_date, appointment_time, reminder, reminder_message, patient_phone, sms_consent, sms_status,
      sms_sent_at, sms_last_attempt_at, sms_last_error, sms_sid, sms_provider_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [appointment.id, userId.toString(), appointment.doctor, appointment.date, appointment.time, appointment.reminder,
      appointment.reminderMessage, appointment.patientPhone, appointment.smsConsent, appointment.smsStatus,
      appointment.smsSentAt ?? null, appointment.smsLastAttemptAt ?? null, appointment.smsLastError ?? null,
      appointment.smsSid ?? null, appointment.smsProviderStatus ?? null],
  )
  return appointment
}

export async function updateAppointment(userId: bigint, appointment: StoredAppointment): Promise<StoredAppointment | undefined> {
  const [result] = await getDatabasePool().execute<ResultSetHeader>(
    `UPDATE appointments SET doctor = ?, appointment_date = ?, appointment_time = ?, reminder = ?, reminder_message = ?, patient_phone = ?, sms_consent = ?,
      sms_status = ?, sms_sent_at = ?, sms_last_attempt_at = ?, sms_last_error = ?, sms_sid = ?, sms_provider_status = ?
     WHERE public_id = ? AND user_id = ?`,
    [appointment.doctor, appointment.date, appointment.time, appointment.reminder, appointment.reminderMessage, appointment.patientPhone,
      appointment.smsConsent, appointment.smsStatus, appointment.smsSentAt ?? null, appointment.smsLastAttemptAt ?? null,
      appointment.smsLastError ?? null, appointment.smsSid ?? null, appointment.smsProviderStatus ?? null, appointment.id, userId.toString()],
  )
  return result.affectedRows ? appointment : undefined
}

export async function deleteAppointment(userId: bigint, id: string): Promise<boolean> {
  const [result] = await getDatabasePool().execute<ResultSetHeader>('DELETE FROM appointments WHERE public_id = ? AND user_id = ?', [id, userId.toString()])
  return result.affectedRows > 0
}

/** Used by the reminder scheduler; updates only existing appointment rows. */
export async function saveAppointments(appointments: StoredAppointment[]) {
  await Promise.all(appointments.map(async (appointment) => {
    await getDatabasePool().execute(
      `UPDATE appointments SET sms_status = ?, sms_sent_at = ?, sms_last_attempt_at = ?, sms_last_error = ?, sms_sid = ?, sms_provider_status = ? WHERE public_id = ?`,
      [appointment.smsStatus, appointment.smsSentAt ?? null, appointment.smsLastAttemptAt ?? null, appointment.smsLastError ?? null,
        appointment.smsSid ?? null, appointment.smsProviderStatus ?? null, appointment.id],
    )
  }))
}

export async function appendSmsLog(entry: SmsDeliveryLog) {
  let appointmentId: string | null = null
  if (entry.appointmentId) {
    const [rows] = await getDatabasePool().execute<RowDataPacket[]>('SELECT id FROM appointments WHERE public_id = ? LIMIT 1', [entry.appointmentId])
    appointmentId = rows[0] ? String(rows[0].id) : null
  }
  await getDatabasePool().execute(
    'INSERT INTO appointment_sms_logs (appointment_id, created_at, event, sid, status, error) VALUES (?, ?, ?, ?, ?, ?)',
    [appointmentId, entry.createdAt.slice(0, 19).replace('T', ' '), entry.event, entry.sid ?? null, entry.status ?? null, entry.error ?? null],
  )
}

export function isReminder(value: unknown): value is AppointmentReminder {
  return value === '15m' || value === '30m' || value === '1h' || value === '1d' || value === '2d'
}
