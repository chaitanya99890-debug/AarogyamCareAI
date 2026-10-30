import { apiGet, apiPost } from './api'

export type AdminDashboard = { counts: Record<string, number>; recentUsers: AdminUser[]; recentAppointments: AdminAppointment[] }
export type AdminUser = { id: string; name: string; email: string; role: 'user' | 'admin'; createdAt: string }
export type AdminAppointment = { id: string; doctor: string; date: string; time: string; reminder: string; smsStatus: string; smsLastError?: string; userName: string; userEmail: string; createdAt: string }
export type AdminReport = { id: string; name: string; type: string; size: number; status: string; uploadedAt: string; userName: string; userEmail: string; analysisSummary?: string }
export type AdminPredictions = { disease: { id: string; prediction: string; confidence: number | null; symptoms: string[]; modelName: string | null; createdAt: string; userName: string; userEmail: string }[]; risk: { id: string; riskResult: string; probability: number | null; modelName: string | null; createdAt: string; userName: string; userEmail: string }[] }
export type AdminSmsStatus = { configured: boolean; message: string; reminders: Record<string, number> }

export const getAdminDashboard = () => apiGet<AdminDashboard>('/api/admin/dashboard')
export const getAdminUsers = (search = '', role = '', page = 1) => apiGet<{ users: AdminUser[]; total: number; page: number; pageSize: number }>(`/api/admin/users?search=${encodeURIComponent(search)}&role=${encodeURIComponent(role)}&page=${page}`)
export const getAdminAppointments = () => apiGet<{ appointments: AdminAppointment[] }>('/api/admin/appointments')
export const getAdminReports = () => apiGet<{ reports: AdminReport[] }>('/api/admin/reports')
export const getAdminReportAnalysis = (id: string) => apiGet<{ id: string; name: string; analysis: unknown }>(`/api/admin/reports/${encodeURIComponent(id)}/analysis`)
export const getAdminPredictions = () => apiGet<AdminPredictions>('/api/admin/predictions')
export const getAdminSmsStatus = () => apiGet<AdminSmsStatus>('/api/admin/sms/status')
export const sendAdminTestSms = (to: string, message: string) => apiPost<{ message: string }>('/api/admin/sms/test', { to, message })
