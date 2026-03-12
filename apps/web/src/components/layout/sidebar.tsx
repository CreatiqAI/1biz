'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NavIcon } from '@/components/ui/nav-icon'
import { useAuthStore } from '@/store/auth.store'
import { Permission } from '@1biz/shared'
import { hasAnyPermission } from '@/lib/permissions'

interface NavItem {
  label: string
  href: string
  iconName: string
}

interface NavGroup {
  group: string
  alwaysOpen?: boolean
  // Active color for text + bg when this group's section is current
  activeText: string
  activeBg: string
  accentBg: string   // left bar color
  items: NavItem[]
  /** If set, user needs at least one of these permissions to see this group */
  requiredPermissions?: Permission[]
}

const adminGroup: NavGroup = {
  group: 'Admin',
  activeText: 'text-rose-700',
  activeBg: 'bg-rose-50',
  accentBg: 'bg-rose-500',
  items: [
    { label: 'Platform', href: '/admin', iconName: 'shield' },
  ],
}

const baseNavGroups: NavGroup[] = [
  {
    group: 'Main',
    alwaysOpen: true,
    activeText: 'text-brand-700',
    activeBg: 'bg-brand-50',
    accentBg: 'bg-brand-500',
    items: [
      { label: 'Dashboard', href: '/dashboard', iconName: 'dashboard' },
    ],
  },
  {
    group: 'Accounting',
    activeText: 'text-emerald-700',
    activeBg: 'bg-emerald-50',
    accentBg: 'bg-emerald-500',
    requiredPermissions: [Permission.ACCOUNTING_VIEW],
    items: [
      { label: 'Overview',   href: '/accounting',              iconName: 'chart' },
      { label: 'Invoices',   href: '/accounting/invoices',     iconName: 'invoice' },
      { label: 'Bills',      href: '/accounting/bills',        iconName: 'bill' },
      { label: 'Payments',   href: '/accounting/payments',     iconName: 'card' },
      { label: 'Journals',   href: '/accounting/journals',     iconName: 'journal' },
      { label: 'Reports',    href: '/accounting/reports',      iconName: 'report' },
      { label: 'Banking',    href: '/accounting/banking',      iconName: 'bank' },
      { label: 'Compliance', href: '/accounting/compliance',   iconName: 'compliance' },
      { label: 'Contacts',   href: '/accounting/contacts',     iconName: 'users' },
    ],
  },
  {
    group: 'CRM',
    activeText: 'text-violet-700',
    activeBg: 'bg-violet-50',
    accentBg: 'bg-violet-500',
    requiredPermissions: [Permission.CRM_VIEW],
    items: [
      { label: 'Overview',      href: '/crm',                 iconName: 'target' },
      { label: 'Leads',         href: '/crm/leads',           iconName: 'leads' },
      { label: 'Opportunities', href: '/crm/opportunities',   iconName: 'briefcase' },
      { label: 'Quotations',    href: '/crm/quotations',      iconName: 'clipboard' },
    ],
  },
  {
    group: 'Inventory',
    activeText: 'text-amber-700',
    activeBg: 'bg-amber-50',
    accentBg: 'bg-amber-500',
    requiredPermissions: [Permission.INVENTORY_VIEW],
    items: [
      { label: 'Products',   href: '/inventory/products',   iconName: 'box' },
      { label: 'Warehouses', href: '/inventory/warehouses', iconName: 'building' },
      { label: 'Stock',      href: '/inventory/stock',      iconName: 'arrows-rotate' },
    ],
  },
  {
    group: 'HR & Payroll',
    activeText: 'text-sky-700',
    activeBg: 'bg-sky-50',
    accentBg: 'bg-sky-500',
    requiredPermissions: [Permission.HR_VIEW],
    items: [
      { label: 'Overview',    href: '/hr',              iconName: 'home' },
      { label: 'Employees',   href: '/hr/employees',    iconName: 'person' },
      { label: 'Departments', href: '/hr/departments',  iconName: 'hierarchy' },
      { label: 'Positions',   href: '/hr/positions',    iconName: 'briefcase' },
      { label: 'Leave',       href: '/hr/leave',        iconName: 'calendar' },
      { label: 'Holidays',    href: '/hr/holidays',     iconName: 'calendar' },
      { label: 'Attendance',  href: '/hr/attendance',   iconName: 'clock' },
      { label: 'Claims',      href: '/hr/claims',       iconName: 'receipt' },
      { label: 'Payroll',     href: '/hr/payroll',      iconName: 'banknote' },
    ],
  },
  {
    group: 'Settings',
    activeText: 'text-gray-700',
    activeBg: 'bg-gray-100',
    accentBg: 'bg-gray-500',
    requiredPermissions: [Permission.SETTINGS_VIEW],
    items: [
      { label: 'Company',   href: '/settings',           iconName: 'gear' },
      { label: 'Users',     href: '/settings/users',     iconName: 'key' },
      { label: 'Audit Log', href: '/settings/audit',     iconName: 'audit-log' },
      { label: 'WhatsApp',  href: '/settings/whatsapp',  iconName: 'whatsapp' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const navGroups = useMemo(() => {
    const roles = user?.roles ?? []
    const isSuperAdmin = user?.isSuperAdmin || roles.includes('super_admin')

    // Filter groups based on user permissions
    const filtered = baseNavGroups.filter((g) => {
      if (!g.requiredPermissions) return true // no restriction (e.g. Dashboard)
      return hasAnyPermission(roles, g.requiredPermissions)
    })

    return isSuperAdmin ? [adminGroup, ...filtered] : filtered
  }, [user])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed')
      if (saved) setCollapsed(JSON.parse(saved))
    } catch {}
  }, [])

  const toggleGroup = (group: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [group]: !prev[group] }
      try { localStorage.setItem('sidebar-collapsed', JSON.stringify(next)) } catch {}
      return next
    })
  }

  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col h-full print:hidden">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-[9px] tracking-tight">1Biz</span>
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">1Biz</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => {
          const isCollapsed = !group.alwaysOpen && !!collapsed[group.group]
          const groupIsActive = group.items.some((item) =>
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href),
          )

          return (
            <div key={group.group} className="mb-2">
              {/* Group header */}
              {group.alwaysOpen ? (
                <div className="h-0.5" />
              ) : (
                <button
                  onClick={() => toggleGroup(group.group)}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-1 mb-0.5 rounded-md text-left transition-colors',
                    groupIsActive ? group.activeText : 'text-gray-400 hover:text-gray-600',
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest">{group.group}</span>
                  <svg
                    className={cn('w-3 h-3 transition-transform duration-200', isCollapsed ? '-rotate-90' : '')}
                    viewBox="0 0 12 12" fill="none"
                  >
                    <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}

              {/* Items */}
              {!isCollapsed && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      item.href === '/'
                        ? pathname === '/'
                        : pathname === item.href || pathname.startsWith(item.href + '/')

                    return (
                      <li key={item.href} className="relative">
                        {/* Left accent bar */}
                        {isActive && (
                          <span className={cn('absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full', group.accentBg)} />
                        )}
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150',
                            isActive
                              ? cn(group.activeBg, group.activeText, 'font-medium')
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                          )}
                        >
                          {/* Duo-tone icon — inherits text color */}
                          <NavIcon name={item.iconName} />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-gray-100 shrink-0 space-y-2">
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('open-command-bar'))}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
        >
          <span>Search & commands</span>
          <kbd className="bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
        </button>
        <div className="bg-brand-50 rounded-xl px-3 py-2.5">
          <p className="text-xs text-brand-700 font-semibold">{user?.companyName ?? '1Biz'}</p>
          <p className="text-[11px] text-brand-500 mt-0.5">{user?.email ?? ''}</p>
        </div>
      </div>
    </aside>
  )
}
