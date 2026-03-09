'use client'
import { useState, useCallback, useRef } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isError?: boolean
}

// Send last 50 messages as context
const MAX_HISTORY = 50

// Resolve API base — same logic as lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'

/** Try to refresh the access token using the stored refresh token. Returns the new access token or null. */
async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const { accessToken, refreshToken: newRefresh } = json.data.tokens
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', newRefresh)
    return accessToken
  } catch {
    return null
  }
}

/** Parse SSE events from a raw text chunk (may contain multiple events) */
function parseSSEEvents(raw: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = []
  const blocks = raw.split('\n\n')
  for (const block of blocks) {
    if (!block.trim()) continue
    let event = 'message'
    let data = ''
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7)
      else if (line.startsWith('data: ')) data = line.slice(6)
    }
    if (data) events.push({ event, data })
  }
  return events
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusText, setStatusText] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setStatusText('Thinking...')

      // Build history (exclude error placeholders)
      const history = messages
        .filter((m) => !m.isError)
        .slice(-MAX_HISTORY)
        .map(({ role, content: c }) => ({ role, content: c }))

      // AbortController for cleanup
      const abort = new AbortController()
      abortRef.current = abort

      try {
        let token = localStorage.getItem('accessToken')

        const doFetch = (t: string | null) =>
          fetch(`${API_BASE}/chat/message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(t ? { Authorization: `Bearer ${t}` } : {}),
            },
            body: JSON.stringify({ message: content.trim(), history }),
            signal: abort.signal,
          })

        let response = await doFetch(token)

        // Auto-refresh token on 401
        if (response.status === 401) {
          const newToken = await tryRefreshToken()
          if (newToken) {
            token = newToken
            response = await doFetch(token)
          } else {
            window.location.href = '/login'
            return
          }
        }

        if (!response.ok) {
          throw new Error('Sorry, I had a hiccup. Could you try sending that again?')
        }

        // Read the SSE stream
        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response stream')

        const decoder = new TextDecoder()
        let buffer = ''

        const processEvents = (raw: string) => {
          const events = parseSSEEvents(raw)
          for (const evt of events) {
            if (evt.event === 'status') {
              try {
                const { text } = JSON.parse(evt.data)
                setStatusText(text)
              } catch { /* ignore parse errors */ }
            } else if (evt.event === 'done') {
              try {
                const { reply } = JSON.parse(evt.data)
                const assistantMessage: ChatMessage = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: reply,
                  timestamp: new Date(),
                }
                setMessages((prev) => [...prev, assistantMessage])
              } catch { /* ignore parse errors */ }
            } else if (evt.event === 'error') {
              try {
                const { message } = JSON.parse(evt.data)
                const errorMessage: ChatMessage = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: message || 'Sorry, something went wrong. Please try again.',
                  timestamp: new Date(),
                  isError: true,
                }
                setMessages((prev) => [...prev, errorMessage])
              } catch { /* ignore parse errors */ }
            }
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Try to parse complete SSE events from the buffer
          const lastDoubleNewline = buffer.lastIndexOf('\n\n')
          if (lastDoubleNewline === -1) continue

          const complete = buffer.slice(0, lastDoubleNewline + 2)
          buffer = buffer.slice(lastDoubleNewline + 2)
          processEvents(complete)
        }

        // Process any remaining data in buffer after stream ends
        if (buffer.trim()) {
          processEvents(buffer)
        }
      } catch (err: unknown) {
        // Only show error if not aborted
        if (err instanceof DOMException && err.name === 'AbortError') return

        const msg = err instanceof Error
          ? err.message
          : 'Sorry, I had a hiccup. Could you try sending that again?'

        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: msg,
          timestamp: new Date(),
          isError: true,
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
        setStatusText(null)
        abortRef.current = null
      }
    },
    [messages, isLoading],
  )

  const clearChat = useCallback(() => {
    // Abort any in-flight request
    abortRef.current?.abort()
    setMessages([])
    setIsLoading(false)
    setStatusText(null)
  }, [])

  return { messages, isLoading, statusText, sendMessage, clearChat }
}
