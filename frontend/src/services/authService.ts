import type { AuthResponse, SignupPayload, User } from '../types'
import { AppError, apiPost } from './api'

interface AuthApiPayload {
  user?: User
  token?: string
  data?: AuthResponse
}

function normalizeAuth(payload: AuthApiPayload, fallback: User): AuthResponse {
  const user = payload.user ?? payload.data?.user ?? fallback
  const token = payload.token ?? payload.data?.token
  if (!user?.id || !user.email || (user.role !== 'user' && user.role !== 'admin')) {
    throw new AppError('Something went wrong while connecting to AarogyamCare AI. Please try again.')
  }
  return { user, token }
}

async function loginRequestForRole(email: string, password: string, path: string, role: User['role']): Promise<AuthResponse> {
  try {
    const payload = await apiPost<AuthApiPayload>(path, { email, password })
    const result = normalizeAuth(payload, { id: email, name: email.split('@')[0] ?? 'Member', email, role })
    if (result.user.role !== role) throw new AppError('This account must use its designated sign-in page.')
    return result
  } catch (error) {
    if (error instanceof AppError && error.status) {
      throw new AppError('Incorrect email or password. Please try again.', error.status)
    }
    throw error
  }
}

export const loginRequest = (email: string, password: string) => loginRequestForRole(email, password, '/api/auth/login', 'user')
export const adminLoginRequest = (email: string, password: string) => loginRequestForRole(email, password, '/api/auth/admin/login', 'admin')

export async function signupRequest(input: SignupPayload): Promise<AuthResponse> {
  try {
    const payload = await apiPost<AuthApiPayload>('/api/auth/register', {
      name: input.name,
      email: input.email,
      password: input.password,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      phone: input.phone,
    })
    return normalizeAuth(payload, {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      role: 'user',
    })
  } catch (error) {
    if (error instanceof AppError && error.status && error.status < 500) {
      throw new AppError('Unable to create your account with the provided details. Please review and try again.')
    }
    throw error
  }
}

export async function forgotPasswordRequest(email: string): Promise<void> {
  try {
    await apiPost('/api/auth/forgot-password', { email })
  } catch (error) {
    if (error instanceof AppError && !error.status) {
      return
    }
    throw error
  }
}
