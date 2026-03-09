'use client'
import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import QRCode from 'qrcode'

type ConnectionStatus = 'disconnected' | 'qr_pending' | 'connected'

export default function WhatsAppSettingsPage() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = async () => {
    try {
      const res = await api.get('/whatsapp/status')
      const data = res.data
      setEnabled(data.enabled)
      setStatus(data.status)
      if (data.qr) {
        const url = await QRCode.toDataURL(data.qr, { width: 260, margin: 2, color: { dark: '#111827', light: '#ffffff' } })
        setQrDataUrl(url)
      } else {
        setQrDataUrl(null)
      }
    } catch {
      // silently ignore polling errors
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">WhatsApp Integration</h1>
        <p className="text-gray-500 text-sm mt-1">
          Connect your WhatsApp to chat with 1Biz Assistant directly from your phone
        </p>
      </div>

      {/* Status banner */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full shrink-0 ${
          status === 'connected'
            ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]'
            : status === 'qr_pending'
            ? 'bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.2)] animate-pulse'
            : 'bg-gray-300'
        }`} />
        <div>
          <p className="text-sm font-medium text-gray-800">
            {status === 'connected' && 'Connected'}
            {status === 'qr_pending' && 'Waiting for QR scan'}
            {status === 'disconnected' && (enabled ? 'Disconnected — reconnecting…' : 'WhatsApp is disabled')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {status === 'connected' && 'WhatsApp is active. Messages will be handled by 1Biz Assistant.'}
            {status === 'qr_pending' && 'Open WhatsApp on your phone → Linked Devices → Link a Device → scan below.'}
            {status === 'disconnected' && (enabled ? 'The service is trying to reconnect.' : 'Set WHATSAPP_ENABLED=true in your .env to activate.')}
          </p>
        </div>
      </div>

      {/* QR Code card */}
      {status === 'qr_pending' && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 flex flex-col items-center gap-5">
          <p className="text-sm font-medium text-gray-700">Scan with WhatsApp</p>
          {loading || !qrDataUrl ? (
            <div className="w-[260px] h-[260px] bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <img
              src={qrDataUrl}
              alt="WhatsApp QR Code"
              className="w-[260px] h-[260px] rounded-xl border border-gray-100"
            />
          )}
          <ol className="text-xs text-gray-500 space-y-1 text-left w-full max-w-xs list-decimal list-inside">
            <li>Open WhatsApp on your phone</li>
            <li>Tap the 3-dot menu (⋮) or Settings</li>
            <li>Tap <span className="font-medium text-gray-700">Linked Devices</span></li>
            <li>Tap <span className="font-medium text-gray-700">Link a Device</span></li>
            <li>Point your phone camera at the QR code above</li>
          </ol>
          <p className="text-[11px] text-gray-400">QR code refreshes automatically</p>
        </div>
      )}

      {/* Connected state */}
      {status === 'connected' && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-6 flex items-center gap-4">
          <div className="text-3xl">✅</div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">WhatsApp is connected</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Send any message to your linked WhatsApp number to chat with 1Biz Assistant.
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">How it works</h2>
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex gap-2">
            <span className="text-base leading-none">📱</span>
            <p>Send a message from your phone (e.g. <span className="font-medium text-gray-700">"show my invoices"</span>)</p>
          </div>
          <div className="flex gap-2">
            <span className="text-base leading-none">🤖</span>
            <p>1Biz Assistant processes it using all 44 ERP tools — accounting, HR, inventory, CRM</p>
          </div>
          <div className="flex gap-2">
            <span className="text-base leading-none">💬</span>
            <p>You get a reply directly in WhatsApp, no browser needed</p>
          </div>
          <div className="flex gap-2 pt-1">
            <span className="text-base leading-none">🔒</span>
            <p>Only numbers in <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">WHATSAPP_ALLOWED_NUMBERS</code> can interact with the bot</p>
          </div>
        </div>
      </div>
    </div>
  )
}
