import type { HealthProfile, ReportAnalysis } from '../types'
import { AppError, apiGet, apiPost, apiPut } from './api'

export const MAX_REPORT_SIZE_BYTES = 10 * 1024 * 1024
export const SUPPORTED_REPORT_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg'])

export function validateReportFile(file: File): void {
  if (!SUPPORTED_REPORT_TYPES.has(file.type)) {
    throw new AppError('Please choose a PDF, PNG, or JPG report.')
  }
  if (file.size <= 0) {
    throw new AppError('Please choose a non-empty report file.')
  }
  if (file.size > MAX_REPORT_SIZE_BYTES) {
    throw new AppError('Please choose a report smaller than 10 MB.')
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new AppError('Unable to read the selected report.'))
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new AppError('Unable to read the selected report.'))
        return
      }
      resolve(base64)
    }
    reader.readAsDataURL(file)
  })
}

export async function uploadReport(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ id: string; name: string }> {
  validateReportFile(file)
  onProgress?.(20)
  const response = await apiPost<{ id: string; name: string }>('/api/reports', {
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  })
  onProgress?.(100)
  return response
}

export async function analyzeReport(file: File): Promise<ReportAnalysis> {
  validateReportFile(file)

  return apiPost<ReportAnalysis>('/api/reports/analyze', {
    fileName: file.name,
    mimeType: file.type,
    data: await readFileAsBase64(file),
  })
}

export async function analyzeImage(file: File): Promise<ReportAnalysis> {
  // Image files use the implemented report-analysis endpoint. It accepts PNG
  // and JPEG input and returns the same structured educational analysis.
  return analyzeReport(file)
}

export async function fetchReports(): Promise<{ id: string; name: string; uploadedAt: string; status: 'uploaded' | 'analyzed' | 'failed'; type: string }[]> {
  const response = await apiGet<{ reports: { id: string; name: string; uploadedAt: string; status: 'uploaded' | 'analyzed' | 'failed'; type: string }[] }>('/api/reports')
  return response.reports
}

export async function fetchHealthProfile(): Promise<HealthProfile> {
  return apiGet<HealthProfile>('/api/health-profile')
}

export async function saveHealthProfile(profile: HealthProfile): Promise<HealthProfile> {
  return apiPut<HealthProfile>('/api/health-profile', profile)
}
