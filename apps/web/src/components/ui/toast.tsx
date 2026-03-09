'use client'
import { createContext, useContext, useState, useCallback } from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error'
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { ...t, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const variantClasses: Record<string, string> = {
    default: 'bg-white border-gray-200',
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
  }

  const titleClasses: Record<string, string> = {
    default: 'text-gray-900',
    success: 'text-emerald-900',
    error: 'text-red-900',
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            open
            onOpenChange={(open) => { if (!open) removeToast(t.id) }}
            className={`rounded-lg border p-4 shadow-lg ${variantClasses[t.variant ?? 'default']}`}
          >
            <ToastPrimitive.Title className={`text-sm font-semibold ${titleClasses[t.variant ?? 'default']}`}>
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="text-xs text-gray-500 mt-1">
                {t.description}
              </ToastPrimitive.Description>
            )}
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[360px] max-w-[90vw]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}
