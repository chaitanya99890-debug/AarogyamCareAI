import axios, { type AxiosError } from 'axios'
import { AppError, apiPost } from './api'
import type { RiskPredictionRequest, RiskPredictionResponse } from '../types'

const riskPredictionClient = axios.create({
  baseURL: import.meta.env.VITE_ML_API_URL ?? 'http://localhost:8000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

function riskPredictionError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string | { message?: string }; message?: string }>
    if (!axiosError.response) {
      return new AppError('Health risk prediction is unavailable. Please make sure the ML backend is running.')
    }
    const detail = axiosError.response.data?.detail
    return new AppError(
      (typeof detail === 'string' ? detail : detail?.message) ?? axiosError.response.data?.message ??
        'The health risk estimate could not be completed. Please try again.',
      axiosError.response.status,
    )
  }
  return new AppError('The health risk estimate could not be completed. Please try again.')
}

export async function predictHealthRisk(request: RiskPredictionRequest): Promise<RiskPredictionResponse> {
  try {
    const response = await riskPredictionClient.post<RiskPredictionResponse>('/predict-risk', request)
    const result = response.data
    if (
      !['Lower Risk', 'Higher Risk'].includes(result.risk_level) ||
      ![0, 1].includes(result.prediction) ||
      typeof result.probability !== 'number' ||
      !Number.isFinite(result.probability) ||
      typeof result.model !== 'string' ||
      typeof result.message !== 'string'
    ) {
      throw new AppError('The ML backend returned an invalid health risk result.')
    }
    const normalizedResult: RiskPredictionResponse = {
      ...result,
      // A locally running ML service may still be on the previous response
      // version during a frontend refresh. The core prediction remains valid;
      // use empty optional-display sections until that service is restarted.
      input_warnings: Array.isArray(result.input_warnings) ? result.input_warnings : [],
      reported_input_context: Array.isArray(result.reported_input_context) ? result.reported_input_context : [],
    }
    try {
      await apiPost('/api/risk-assessments', {
        riskResult: normalizedResult.risk_level,
        probability: normalizedResult.probability,
        inputData: request,
        modelName: normalizedResult.model,
      })
    } catch (persistenceError) {
      // Do not turn a successful local ML result into a failed user request.
      console.error('Could not save health risk history:', persistenceError)
    }
    return normalizedResult
  } catch (error) {
    throw riskPredictionError(error)
  }
}
