// High-fidelity status glyphs for HR and other modules.
// Each status has a distinct geometric indicator + animation (where appropriate).

interface Props {
  status: string
  showLabel?: boolean
}

const GLYPHS: Record<string, {
  indicator: React.ReactNode
  label: string
  labelClass: string
}> = {
  ACTIVE: {
    indicator: (
      // Pulsing emerald sphere — signals "live" status
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_0_1.5px_rgba(52,211,153,0.3)]" />
      </span>
    ),
    label: 'Active',
    labelClass: 'text-emerald-700',
  },

  PROBATION: {
    indicator: (
      // Amber rotated square (diamond) — "in progress / watch"
      <span
        className="inline-flex h-2.5 w-2.5 shrink-0 bg-amber-400 shadow-[0_0_0_1.5px_rgba(251,191,36,0.3)]"
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
      />
    ),
    label: 'Probation',
    labelClass: 'text-amber-700',
  },

  SUSPENDED: {
    indicator: (
      // Amber triangle — "caution / warning"
      <svg viewBox="0 0 10 10" className="w-3 h-3 shrink-0 fill-amber-400">
        <polygon points="5,1 9.5,9 0.5,9" />
      </svg>
    ),
    label: 'Suspended',
    labelClass: 'text-amber-700',
  },

  RESIGNED: {
    indicator: (
      // Matte gray circle — "neutral / gone"
      <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />
    ),
    label: 'Resigned',
    labelClass: 'text-gray-500',
  },

  TERMINATED: {
    indicator: (
      // Charcoal X — "closed / ended"
      <svg viewBox="0 0 10 10" className="w-3 h-3 shrink-0" fill="none">
        <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    label: 'Terminated',
    labelClass: 'text-red-600',
  },
}

export function StatusGlyph({ status, showLabel = true }: Props) {
  const glyph = GLYPHS[status]
  if (!glyph) {
    return <span className="text-xs text-gray-500 font-medium">{status}</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      {glyph.indicator}
      {showLabel && (
        <span className={`text-xs font-semibold tracking-tight ${glyph.labelClass}`}>
          {glyph.label}
        </span>
      )}
    </span>
  )
}

// For use in dropdowns / selectors — all status options listed
export const STATUS_OPTIONS = ['ACTIVE', 'PROBATION', 'SUSPENDED', 'RESIGNED', 'TERMINATED'] as const
