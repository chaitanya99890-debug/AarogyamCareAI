import { AppError, apiDelete, apiGet, apiPost } from './api'

interface ChatApiResponse {
  reply?: string
  chatId?: string
  message?: string
  content?: string
  data?: { reply?: string; message?: string }
}

export interface PersistedChatThread {
  id: string
  title: string
  preview: string
  updatedAt: string
  messages: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[]
}

export async function sendChatMessage(message: string, chatId?: string): Promise<string> {
  const payload = await apiPost<ChatApiResponse>('/api/chat', { message, chatId })
  const text =
    payload.reply ??
    payload.message ??
    payload.content ??
    payload.data?.reply ??
    payload.data?.message
  if (!text?.trim()) {
    throw new AppError('AarogyamCare AI did not return a response. Please try again.')
  }
  return text.trim()
}

export async function fetchChatConversations(): Promise<PersistedChatThread[]> {
  const response = await apiGet<{ conversations?: PersistedChatThread[] }>('/api/chat/conversations')
  return Array.isArray(response.conversations) ? response.conversations : []
}

export async function fetchChatMessages(chatId: string): Promise<PersistedChatThread['messages']> {
  const response = await apiGet<{ messages?: PersistedChatThread['messages'] }>(`/api/chat/conversations/${encodeURIComponent(chatId)}/messages`)
  return Array.isArray(response.messages) ? response.messages : []
}

export async function deleteChatConversation(chatId: string): Promise<void> {
  await apiDelete(`/api/chat/conversations/${encodeURIComponent(chatId)}`)
}
