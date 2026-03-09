'use client'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { getInitials } from '@/lib/utils'

export function TopBar() {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 print:hidden">
      {/* Cmd+K search trigger */}
      <button
        onClick={() => document.dispatchEvent(new CustomEvent('open-command-bar'))}
        className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:block ml-1 text-[10px] text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      <div className="flex items-center gap-3">
        {/* User menu */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
            <span className="text-brand-700 text-xs font-semibold">
              {user ? getInitials(user.fullName) : 'U'}
            </span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors ml-2"
        >
          Log Out
        </button>
      </div>
    </header>
  )
}
