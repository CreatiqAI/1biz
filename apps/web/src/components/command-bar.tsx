'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: string
  category: string
  href?: string
  keywords?: string[]
}

const COMMANDS: CommandItem[] = [
  // Navigation
  { id: 'nav-dashboard', label: 'Dashboard', icon: '⊞', category: 'Navigate', href: '/' },
  { id: 'nav-invoices', label: 'Invoices', icon: '📄', category: 'Navigate', href: '/accounting/invoices', keywords: ['billing', 'accounting'] },
  { id: 'nav-payments', label: 'Payments', icon: '💳', category: 'Navigate', href: '/accounting/payments', keywords: ['accounting'] },
  { id: 'nav-contacts', label: 'Contacts', icon: '👥', category: 'Navigate', href: '/accounting/contacts', keywords: ['customer', 'supplier'] },
  { id: 'nav-leads', label: 'Leads', icon: '🧲', category: 'Navigate', href: '/crm/leads', keywords: ['crm', 'sales'] },
  { id: 'nav-opportunities', label: 'Opportunities', icon: '💼', category: 'Navigate', href: '/crm/opportunities', keywords: ['crm', 'pipeline', 'sales'] },
  { id: 'nav-quotations', label: 'Quotations', icon: '📋', category: 'Navigate', href: '/crm/quotations', keywords: ['crm', 'quote'] },
  { id: 'nav-products', label: 'Products', icon: '📦', category: 'Navigate', href: '/inventory/products', keywords: ['inventory', 'stock', 'item'] },
  { id: 'nav-warehouses', label: 'Warehouses', icon: '🏭', category: 'Navigate', href: '/inventory/warehouses', keywords: ['inventory'] },
  { id: 'nav-employees', label: 'Employees', icon: '👤', category: 'Navigate', href: '/hr/employees', keywords: ['hr', 'staff'] },
  { id: 'nav-leave', label: 'Leave Management', icon: '📅', category: 'Navigate', href: '/hr/leave', keywords: ['hr', 'annual', 'mc'] },
  { id: 'nav-payroll', label: 'Payroll', icon: '💰', category: 'Navigate', href: '/hr/payroll', keywords: ['hr', 'salary', 'epf', 'socso'] },
  { id: 'nav-settings', label: 'Company Settings', icon: '⚙️', category: 'Navigate', href: '/settings', keywords: ['company', 'profile'] },

  // Actions
  { id: 'new-invoice', label: 'New Invoice', description: 'Create a new customer invoice', icon: '➕', category: 'Create', href: '/accounting/invoices/new', keywords: ['billing', 'create'] },
  { id: 'new-quotation', label: 'New Quotation', description: 'Create a quotation for a customer', icon: '➕', category: 'Create', href: '/crm/quotations/new', keywords: ['quote', 'create'] },
  { id: 'new-employee', label: 'Add Employee', description: 'Onboard a new team member', icon: '➕', category: 'Create', href: '/hr/employees/new', keywords: ['hire', 'staff', 'create'] },
  { id: 'new-product', label: 'New Product', description: 'Add a product to the catalog', icon: '➕', category: 'Create', href: '/inventory/products/new', keywords: ['item', 'create', 'sku'] },
  { id: 'run-payroll', label: 'Run Payroll', description: 'Process this month\'s payroll', icon: '💰', category: 'Create', href: '/hr/payroll/new', keywords: ['salary', 'epf'] },
]

function highlight(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-brand-100 text-brand-800 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function CommandBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? COMMANDS.filter((c) => {
        const q = query.toLowerCase()
        return (
          c.label.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.keywords?.some((k) => k.includes(q)) ||
          c.category.toLowerCase().includes(q)
        )
      })
    : COMMANDS

  // Group by category
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    ;(acc[item.category] ??= []).push(item)
    return acc
  }, {})

  const flatList = filtered

  const execute = useCallback(
    (item: CommandItem) => {
      if (item.href) router.push(item.href)
      setOpen(false)
      setQuery('')
      setActiveIdx(0)
    },
    [router],
  )

  // Keyboard shortcut to open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Open via custom event (from sidebar button)
  useEffect(() => {
    const onEvent = () => setOpen(true)
    document.addEventListener('open-command-bar', onEvent)
    return () => document.removeEventListener('open-command-bar', onEvent)
  }, [])

  // Arrow key navigation + Enter + Escape inside the dialog
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); setActiveIdx(0) }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, flatList.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') { if (flatList[activeIdx]) execute(flatList[activeIdx]) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, flatList, activeIdx, execute])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // Reset active index when results change
  useEffect(() => { setActiveIdx(0) }, [query])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
        onClick={() => { setOpen(false); setQuery(''); setActiveIdx(0) }}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-command overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 16 16">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions, employees..."
            className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400 bg-transparent"
          />
          <kbd className="hidden sm:block text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-mono">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {flatList.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">
              <p className="text-2xl mb-2">🔍</p>
              <p>No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {category}
                </p>
                {items.map((item) => {
                  const globalIdx = flatList.indexOf(item)
                  const isActive = globalIdx === activeIdx
                  return (
                    <button
                      key={item.id}
                      data-idx={globalIdx}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      onClick={() => execute(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-brand-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base w-6 text-center shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isActive ? 'text-brand-700' : 'text-gray-800'}`}>
                          {highlight(item.label, query)}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-400 truncate">{item.description}</p>
                        )}
                      </div>
                      {isActive && (
                        <kbd className="text-[10px] text-brand-500 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded font-mono shrink-0">
                          ↵
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-50 bg-gray-50/50">
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <kbd className="bg-white border border-gray-200 rounded px-1 text-[10px] font-mono">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <kbd className="bg-white border border-gray-200 rounded px-1 text-[10px] font-mono">↵</kbd> open
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <kbd className="bg-white border border-gray-200 rounded px-1 text-[10px] font-mono">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
