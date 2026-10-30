import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { deleteChatConversation, fetchChatConversations, fetchChatMessages, sendChatMessage } from '../services/chatService'
import type { ChatThread, Message } from '../types'
import { AppError } from '../services/api'
import { createId } from '../utils'

interface ChatState {
  chats: ChatThread[]
  activeChatId: string | null
  isSending: boolean
  error: string | null
  pendingRetry: { chatId: string; content: string } | null
  sendMessage: (content: string) => Promise<void>
  retryLastMessage: () => Promise<void>
  createNewChat: () => string
  hydrateChats: () => Promise<void>
  loadChat: (id: string) => Promise<void>
  deleteChat: (id: string) => Promise<void>
  clearError: () => void
}

function titleFrom(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed || 'New conversation'
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
      const requestReply = async (chatId: string, text: string) => {
        set({ isSending: true, error: null, pendingRetry: null })
        try {
          const reply = await sendChatMessage(text, chatId)
          const assistantMessage: Message = {
            id: createId(),
            role: 'assistant',
            content: reply,
            timestamp: new Date().toISOString(),
          }
          set((state) => ({
            isSending: false,
            chats: state.chats.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    preview: reply,
                    updatedAt: assistantMessage.timestamp,
                    messages: [...chat.messages, assistantMessage],
                  }
                : chat,
            ),
          }))
        } catch (error) {
          const message =
            error instanceof AppError
              ? error.message
              : 'Something went wrong while connecting to AarogyamCare AI. Please try again.'
          set({ isSending: false, error: message, pendingRetry: { chatId, content: text } })
        }
      }

      return {
        chats: [],
        activeChatId: null,
        isSending: false,
        error: null,
        pendingRetry: null,

      createNewChat: () => {
        const id = createId()
        const chat: ChatThread = {
          id,
          title: 'New conversation',
          preview: 'Start a conversation with AarogyamCare AI',
          updatedAt: new Date().toISOString(),
          messages: [],
        }
        set((state) => ({ chats: [chat, ...state.chats], activeChatId: id, error: null }))
        return id
      },

      hydrateChats: async () => {
        try {
          const chats = await fetchChatConversations()
          set((state) => ({
            chats,
            activeChatId: state.activeChatId && chats.some((chat) => chat.id === state.activeChatId)
              ? state.activeChatId
              : null,
          }))
        } catch {
          // Preserve the existing device copy during migration or a server outage.
        }
      },

      loadChat: async (id) => {
        set({ activeChatId: id, error: null })
        try {
          const [conversations, messages] = await Promise.all([fetchChatConversations(), fetchChatMessages(id)])
          const serverChat = conversations.find((chat) => chat.id === id)
          if (!serverChat) return
          set((state) => ({
            chats: state.chats.some((chat) => chat.id === id)
              ? state.chats.map((chat) => chat.id === id ? { ...serverChat, messages } : chat)
              : [{ ...serverChat, messages }, ...state.chats],
          }))
        } catch {
          // A local conversation can still be displayed while offline.
        }
      },

      deleteChat: async (id) => {
        set((state) => {
          const chats = state.chats.filter((c) => c.id !== id)
          const activeChatId = state.activeChatId === id ? (chats[0]?.id ?? null) : state.activeChatId
          return { chats, activeChatId }
        })
        try {
          await deleteChatConversation(id)
        } catch {
          // The local persisted copy stays removed; retry is possible after reconnecting.
        }
      },

      clearError: () => set({ error: null, pendingRetry: null }),

      retryLastMessage: async () => {
        const pendingRetry = get().pendingRetry
        if (!pendingRetry) return
        await requestReply(pendingRetry.chatId, pendingRetry.content)
      },

      sendMessage: async (content) => {
        const text = content.trim()
        if (!text) return
        let chatId = get().activeChatId
        if (!chatId) chatId = get().createNewChat()

        const userMessage: Message = {
          id: createId(),
          role: 'user',
          content: text,
          timestamp: new Date().toISOString(),
        }

        set((state) => ({
          error: null,
          pendingRetry: null,
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  title: c.messages.length === 0 ? titleFrom(text) : c.title,
                  preview: text,
                  updatedAt: userMessage.timestamp,
                  messages: [...c.messages, userMessage],
                }
              : c,
          ),
        }))

        await requestReply(chatId, text)
      },
      }
    },
    { name: 'aarogyamcare.chats' },
  ),
)
