'use client'
import { useState, useEffect } from 'react'
import { useTenantSettings, useUpdateTenantSettings } from '@/hooks/use-settings'

const ENV_OPTIONS = [
  { value: 'SANDBOX', label: 'Sandbox (Testing)', desc: 'Use LHDN sandbox for testing — no real submissions' },
  { value: 'PRODUCTION', label: 'Production (Live)', desc: 'Submit real e-invoices to LHDN MyInvois' },
]

export default function EInvoiceSettingsPage() {
  const { data: settings, isLoading } = useTenantSettings()
  const updateSettings = useUpdateTenantSettings()
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    myinvoisEnabled: false,
    myinvoisClientId: '',
    myinvoisClientSecret: '',
    myinvoisTin: '',
    myinvoisBrn: '',
    myinvoisMsicCode: '',
    myinvoisBusinessDesc: '',
    myinvoisEnvironment: 'SANDBOX',
  })

  useEffect(() => {
    if (settings) {
      setForm({
        myinvoisEnabled: settings.myinvoisEnabled ?? false,
        myinvoisClientId: settings.myinvoisClientId ?? '',
        myinvoisClientSecret: settings.myinvoisClientSecret ?? '',
        myinvoisTin: settings.myinvoisTin ?? '',
        myinvoisBrn: settings.myinvoisBrn ?? '',
        myinvoisMsicCode: settings.myinvoisMsicCode ?? '',
        myinvoisBusinessDesc: settings.myinvoisBusinessDesc ?? '',
        myinvoisEnvironment: settings.myinvoisEnvironment ?? 'SANDBOX',
      })
    }
  }, [settings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateSettings.mutateAsync(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // error handled by mutation
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500'

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">E-Invoice Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure MyInvois (LHDN) e-invoicing credentials for electronic invoice submission</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-medium text-blue-800">About MyInvois</p>
        <p className="text-xs text-blue-700 mt-1">
          MyInvois is LHDN&apos;s e-invoicing system. As of 1 January 2026, businesses with annual revenue exceeding RM150,000
          are required to issue e-invoices. You need to register on the{' '}
          <a href="https://myinvois.hasil.gov.my" target="_blank" rel="noopener noreferrer" className="underline font-medium">
            MyInvois Portal
          </a>{' '}
          to obtain API credentials.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Enable Toggle */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Enable E-Invoicing</p>
              <p className="text-xs text-gray-500 mt-0.5">
                When enabled, you can submit invoices to LHDN directly from invoice detail pages
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, myinvoisEnabled: !f.myinvoisEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.myinvoisEnabled ? 'bg-brand-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.myinvoisEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Environment */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Environment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ENV_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  form.myinvoisEnvironment === opt.value
                    ? 'border-brand-300 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="environment"
                  value={opt.value}
                  checked={form.myinvoisEnvironment === opt.value}
                  onChange={() => setForm(f => ({ ...f, myinvoisEnvironment: opt.value }))}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
          {form.myinvoisEnvironment === 'PRODUCTION' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800 font-medium">Warning: Production mode will submit real e-invoices to LHDN. Make sure your credentials are correct.</p>
            </div>
          )}
        </div>

        {/* API Credentials */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">API Credentials</h2>
          <p className="text-xs text-gray-500">
            Obtain these from the{' '}
            <a href="https://myinvois.hasil.gov.my" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">
              MyInvois Portal
            </a>{' '}
            under System Integration &gt; API Credentials
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Client ID</label>
              <input
                type="text"
                className={inputClass}
                value={form.myinvoisClientId}
                onChange={e => setForm(f => ({ ...f, myinvoisClientId: e.target.value }))}
                placeholder="e.g. abc123-def456-..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Client Secret</label>
              <input
                type="password"
                className={inputClass}
                value={form.myinvoisClientSecret}
                onChange={e => setForm(f => ({ ...f, myinvoisClientSecret: e.target.value }))}
                placeholder="Your client secret"
              />
            </div>
          </div>
        </div>

        {/* Company Tax Info */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Company Tax Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tax Identification Number (TIN)</label>
              <input
                type="text"
                className={inputClass}
                value={form.myinvoisTin}
                onChange={e => setForm(f => ({ ...f, myinvoisTin: e.target.value }))}
                placeholder="e.g. C12345678010"
              />
              <p className="text-[10px] text-gray-400 mt-1">Your company TIN from LHDN</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Business Registration Number (BRN)</label>
              <input
                type="text"
                className={inputClass}
                value={form.myinvoisBrn}
                onChange={e => setForm(f => ({ ...f, myinvoisBrn: e.target.value }))}
                placeholder="e.g. 202001012345"
              />
              <p className="text-[10px] text-gray-400 mt-1">SSM registration number</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">MSIC Code</label>
              <input
                type="text"
                className={inputClass}
                value={form.myinvoisMsicCode}
                onChange={e => setForm(f => ({ ...f, myinvoisMsicCode: e.target.value }))}
                placeholder="e.g. 62020"
                maxLength={5}
              />
              <p className="text-[10px] text-gray-400 mt-1">5-digit Malaysia Standard Industrial Classification code</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Business Activity Description</label>
              <input
                type="text"
                className={inputClass}
                value={form.myinvoisBusinessDesc}
                onChange={e => setForm(f => ({ ...f, myinvoisBusinessDesc: e.target.value }))}
                placeholder="e.g. Computer consultancy and management"
              />
              <p className="text-[10px] text-gray-400 mt-1">Must match your SSM business description</p>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Settings saved successfully</span>
          )}
          {updateSettings.isError && (
            <span className="text-sm text-red-500">Failed to save settings</span>
          )}
        </div>
      </form>
    </div>
  )
}
