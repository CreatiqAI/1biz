'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useContacts, useCreateInvoice } from '@/hooks/use-accounting'
import { useProducts } from '@/hooks/use-inventory'

interface LineItem {
  productId: string
  description: string
  quantity: string
  unitPriceRM: string
  discountPercent: string
  sstRate: string
}

const emptyLine = (): LineItem => ({
  productId: '', description: '', quantity: '1', unitPriceRM: '', discountPercent: '0', sstRate: '0',
})

export default function NewInvoicePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    contactId: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    currency: 'MYR',
    notes: '',
    terms: 'Payment due within 30 days.',
  })
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])
  const [error, setError] = useState('')

  const { data: contacts = [] } = useContacts('CUSTOMER')
  const { data: products = [] } = useProducts(true)
  const createInvoice = useCreateInvoice()

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  const setField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const updateLine = (i: number, field: keyof LineItem, value: string) =>
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [field]: value } : l))

  const selectProduct = (i: number, productId: string) => {
    const product = (products as any[]).find((p: any) => p.id === productId)
    if (product) {
      setLines(ls => ls.map((l, idx) => idx === i ? {
        ...l, productId,
        description: product.name,
        unitPriceRM: product.selling_price_sen ? (product.selling_price_sen / 100).toFixed(2) : '',
        sstRate: product.sst_rate ? String(product.sst_rate) : '0',
      } : l))
    } else {
      updateLine(i, 'productId', productId)
    }
  }

  const addLine = () => setLines(ls => [...ls, emptyLine()])
  const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i))

  const computedLines = lines.map(l => {
    const qty = parseFloat(l.quantity) || 0
    const price = parseFloat(l.unitPriceRM) || 0
    const disc = parseFloat(l.discountPercent) || 0
    const sstRate = parseFloat(l.sstRate) || 0
    const subtotal = qty * price * (1 - disc / 100)
    const sst = subtotal * sstRate / 100
    return { subtotal, sst, total: subtotal + sst }
  })

  const subtotalRM = computedLines.reduce((s, l) => s + l.subtotal, 0)
  const sstRM = computedLines.reduce((s, l) => s + l.sst, 0)
  const totalRM = subtotalRM + sstRM

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.contactId) { setError('Please select a customer'); return }
    if (lines.every(l => !l.description)) { setError('Add at least one line item'); return }

    const linesData = lines.filter(l => l.description).map(l => ({
      productId: l.productId || undefined,
      description: l.description,
      quantity: parseFloat(l.quantity) || 1,
      unitPriceSen: Math.round((parseFloat(l.unitPriceRM) || 0) * 100),
      discountPercent: parseFloat(l.discountPercent) || 0,
      sstRate: parseFloat(l.sstRate) || 0,
    }))

    try {
      const result: any = await createInvoice.mutateAsync({
        contactId: form.contactId,
        issueDate: form.issueDate,
        dueDate: form.dueDate || undefined,
        currency: form.currency,
        notes: form.notes || undefined,
        terms: form.terms || undefined,
        lines: linesData,
      })
      router.push(`/accounting/invoices/${result.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create invoice')
    }
  }

  const cellInput = 'w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/accounting/invoices" className="text-gray-400 hover:text-gray-600 text-sm">← Invoices</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-semibold text-gray-900">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

        {/* Header */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Customer <span className="text-red-500">*</span></label>
              <select className={inputClass} value={form.contactId} onChange={setField('contactId')}>
                <option value="">Select customer...</option>
                {(contacts as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}{c.company_name ? ` — ${c.company_name}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <select className={inputClass} value={form.currency} onChange={setField('currency')}>
                <option value="MYR">MYR — Malaysian Ringgit</option>
                <option value="USD">USD — US Dollar</option>
                <option value="SGD">SGD — Singapore Dollar</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Issue Date <span className="text-red-500">*</span></label>
              <input type="date" className={inputClass} value={form.issueDate} onChange={setField('issueDate')} required />
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              <input type="date" className={inputClass} value={form.dueDate} onChange={setField('dueDate')} />
            </div>
          </div>
        </section>

        {/* Line items */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Line Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 w-[22%]">Product</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 w-[24%]">Description *</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 w-[7%]">Qty</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 w-[13%]">Unit Price (RM)</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 w-[8%]">Disc %</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 w-[8%]">SST %</th>
                  <th className="text-right text-xs text-gray-400 font-medium pb-2 w-[14%]">Total (RM)</th>
                  <th className="w-[4%]" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 pr-3">
                      <select className={cellInput} value={line.productId} onChange={e => selectProduct(i, e.target.value)}>
                        <option value="">Custom...</option>
                        {(products as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <input className={cellInput} value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" step="0.001" min="0.001" className={cellInput} value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" step="0.01" min="0" className={cellInput} value={line.unitPriceRM} onChange={e => updateLine(i, 'unitPriceRM', e.target.value)} placeholder="0.00" />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" step="0.01" min="0" max="100" className={cellInput} value={line.discountPercent} onChange={e => updateLine(i, 'discountPercent', e.target.value)} />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" step="0.01" min="0" max="20" className={cellInput} value={line.sstRate} onChange={e => updateLine(i, 'sstRate', e.target.value)} />
                    </td>
                    <td className="py-2 text-right text-xs font-medium text-gray-800">
                      {computedLines[i].total.toFixed(2)}
                    </td>
                    <td className="py-2 pl-2 text-center">
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(i)} className="text-gray-300 hover:text-red-400 text-sm leading-none">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addLine} className="text-xs text-brand-600 hover:text-brand-700 font-medium">+ Add Line</button>
        </section>

        {/* Notes + Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Notes & Terms</h2>
            <div>
              <label className={labelClass}>Notes to Customer</label>
              <textarea rows={3} className={inputClass} value={form.notes} onChange={setField('notes')} placeholder="Thank you for your business." />
            </div>
            <div>
              <label className={labelClass}>Payment Terms</label>
              <textarea rows={2} className={inputClass} value={form.terms} onChange={setField('terms')} placeholder="Payment due within 30 days." />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>RM {subtotalRM.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>SST</span><span>RM {sstRM.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-gray-900 border-t border-gray-100 pt-2 mt-2">
                <span>Total ({form.currency})</span><span>RM {totalRM.toFixed(2)}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createInvoice.isPending}
            className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
          </button>
          <Link href="/accounting/invoices" className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
