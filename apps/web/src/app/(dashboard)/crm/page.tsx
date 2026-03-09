'use client'
import Link from 'next/link'
import { useLeads, useOpportunities, useQuotations } from '@/hooks/use-crm'
import { formatRinggit } from '@/lib/utils'

export default function CrmOverviewPage() {
  const { data: leads = [] } = useLeads()
  const { data: opportunities = [] } = useOpportunities()
  const { data: quotations = [] } = useQuotations()

  const leadsByStatus = (status: string) => (leads as any[]).filter((l: any) => l.status === status).length
  const oppsByStage = (stage: string) => (opportunities as any[]).filter((o: any) => o.stage === stage).length
  const pipelineValue = (opportunities as any[]).reduce((s: number, o: any) => s + Number(o.expected_value_sen ?? 0), 0)
  const wonValue = (opportunities as any[]).filter((o: any) => o.stage === 'CLOSED_WON').reduce((s: number, o: any) => s + Number(o.expected_value_sen ?? 0), 0)
  const quotationTotal = (quotations as any[]).reduce((s: number, q: any) => s + Number(q.total_sen ?? 0), 0)

  const STAGES = [
    { key: 'PROSPECTING', label: 'Prospecting', color: 'bg-gray-400' },
    { key: 'QUALIFICATION', label: 'Qualification', color: 'bg-blue-400' },
    { key: 'PROPOSAL', label: 'Proposal', color: 'bg-amber-400' },
    { key: 'NEGOTIATION', label: 'Negotiation', color: 'bg-orange-400' },
    { key: 'CLOSED_WON', label: 'Won', color: 'bg-green-400' },
    { key: 'CLOSED_LOST', label: 'Lost', color: 'bg-red-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">CRM</h1>
          <p className="text-gray-500 text-sm mt-1">Leads, opportunities, and quotations</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/quotations/new" className="flex items-center gap-2 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            + Quotation
          </Link>
          <Link href="/crm/leads" className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
            + New Lead
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total Leads</p>
          <p className="text-xl font-semibold text-gray-900 mt-0.5">{(leads as any[]).length}</p>
          <p className="text-xs text-gray-400 mt-1">{leadsByStatus('QUALIFIED')} qualified</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Pipeline Value</p>
          <p className="text-xl font-semibold text-brand-600 mt-0.5">{formatRinggit(pipelineValue)}</p>
          <p className="text-xs text-gray-400 mt-1">{(opportunities as any[]).filter((o: any) => !['CLOSED_WON','CLOSED_LOST'].includes(o.stage)).length} active opportunities</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Won This Period</p>
          <p className="text-xl font-semibold text-green-600 mt-0.5">{formatRinggit(wonValue)}</p>
          <p className="text-xs text-gray-400 mt-1">{oppsByStage('CLOSED_WON')} deals closed</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Open Quotations</p>
          <p className="text-xl font-semibold text-gray-900 mt-0.5">{(quotations as any[]).filter((q: any) => ['DRAFT','SENT'].includes(q.status)).length}</p>
          <p className="text-xs text-gray-400 mt-1">{formatRinggit(quotationTotal)} total value</p>
        </div>
      </div>

      {/* Pipeline */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Opportunity Pipeline</h2>
          <Link href="/crm/opportunities" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</Link>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {STAGES.map(stage => (
            <div key={stage.key} className="text-center">
              <div className={`w-10 h-10 rounded-full ${stage.color} text-white flex items-center justify-center text-sm font-bold mx-auto mb-2`}>
                {oppsByStage(stage.key)}
              </div>
              <p className="text-xs text-gray-600 font-medium">{stage.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/crm/leads', icon: '🧲', title: 'Leads', sub: `${(leads as any[]).length} total · ${leadsByStatus('NEW')} new` },
          { href: '/crm/opportunities', icon: '💼', title: 'Opportunities', sub: `${(opportunities as any[]).length} total · ${formatRinggit(pipelineValue)} pipeline` },
          { href: '/crm/quotations', icon: '📋', title: 'Quotations', sub: `${(quotations as any[]).length} total · ${(quotations as any[]).filter((q: any) => q.status === 'ACCEPTED').length} accepted` },
        ].map(item => (
          <Link key={item.href} href={item.href} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-brand-200 transition-colors">
            <p className="text-2xl mb-2">{item.icon}</p>
            <p className="text-sm font-semibold text-gray-800">{item.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
