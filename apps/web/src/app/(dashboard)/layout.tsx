'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'
import { CommandBar } from '@/components/command-bar'
import { ChatPanel } from '@/components/chat/chat-panel'
import { RouteGuard } from '@/components/layout/route-guard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, _hasHydrated } = useAuthStore()

  useEffect(() => {
    // Only redirect AFTER Zustand has loaded from localStorage.
    // Without this, _hasHydrated=false → isAuthenticated=false → immediate redirect on every page load.
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login')
    }
  }, [_hasHydrated, isAuthenticated, router])

  // Show a spinner while waiting for localStorage to rehydrate
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <RouteGuard>{children}</RouteGuard>
        </main>
      </div>
      <CommandBar />
      <ChatPanel />
    </div>
  )
}
