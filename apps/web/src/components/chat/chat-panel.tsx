'use client'
import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useChat } from '@/hooks/use-chat'

// Minimal inline markdown renderer — handles **bold**, `code`, - bullets, line breaks.
// No external library needed, keeps bundle lean.
function MessageContent({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/)
  return (
    <div className="space-y-1">
      {paragraphs.map((para, i) => {
        const lines = para.split('\n')
        const isList = lines.every((l) => l.match(/^[-*•]\s/) || l.trim() === '')

        if (isList) {
          return (
            <ul key={i} className="list-disc list-inside space-y-0.5">
              {lines
                .filter((l) => l.trim())
                .map((line, j) => (
                  <li key={j} className="text-sm leading-snug">
                    <InlineText text={line.replace(/^[-*•]\s+/, '')} />
                  </li>
                ))}
            </ul>
          )
        }

        return (
          <p key={i} className="text-sm leading-relaxed">
            {lines.map((line, j) => (
              <span key={j}>
                <InlineText text={line} />
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return (
    <>
      {parts.map((chunk, i) => {
        if (chunk.startsWith('**') && chunk.endsWith('**')) {
          return <strong key={i}>{chunk.slice(2, -2)}</strong>
        }
        if (chunk.startsWith('`') && chunk.endsWith('`')) {
          return (
            <code key={i} className="bg-gray-200 rounded px-1 text-xs font-mono">
              {chunk.slice(1, -1)}
            </code>
          )
        }
        return <span key={i}>{chunk}</span>
      })}
    </>
  )
}

const SUGGESTIONS = [
  'Show outstanding invoices',
  'Which employees are on leave?',
  'What products are low in stock?',
  'How do I create a payroll run?',
]

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, isLoading, statusText, sendMessage, clearChat } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, statusText])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput('')
    await sendMessage(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleSuggestion = (text: string) => {
    void sendMessage(text)
  }

  return (
    <>
      {/* Floating action button — bottom-right corner */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 print:hidden"
        aria-label={isOpen ? 'Close assistant' : 'Open AI Assistant'}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Invisible backdrop — click to close panel */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 print:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out chat panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-30 w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out print:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">1Biz Assistant</p>
              <p className="text-[10px] text-indigo-200 leading-tight">Powered by 2ndu.ai</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-[11px] text-indigo-200 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-indigo-200 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Empty state with suggestion chips */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center text-center pt-6 pb-2">
              <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-800 mb-1">Hi! I'm your 1Biz Assistant</p>
              <p className="text-xs text-gray-500 mb-4 max-w-[220px]">
                Ask me anything about your business data or how to use the system.
              </p>
              <div className="w-full space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="w-full text-left text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-2 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0 mb-1">
                  AI
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : msg.isError
                      ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-bl-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <MessageContent text={msg.content} />
                )}
                <p
                  className={`text-[10px] mt-1 text-right ${
                    msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString('en-MY', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing / status indicator */}
          {isLoading && (
            <div className="flex items-end gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                AI
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
                <div className="flex gap-1.5 items-center">
                  <div className="flex gap-1 items-center h-3">
                    {[0, 150, 300].map((delay) => (
                      <div
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                  {statusText && (
                    <span className="text-xs text-gray-500 ml-1">{statusText}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ── */}
        <div className="border-t border-gray-100 p-3 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your business..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-60 max-h-32 overflow-y-auto"
              style={{ minHeight: '40px' }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
              aria-label="Send"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  )
}
