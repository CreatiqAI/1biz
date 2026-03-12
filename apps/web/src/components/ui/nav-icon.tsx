// Duo-tone SVG icon set for navigation.
// Two-layer design: primary shape (full opacity) + secondary/bg shape (0.2–0.25 opacity).
// Always uses `currentColor` so the parent element controls the hue.

const ICONS: Record<string, React.ReactNode> = {
  /* ── Main ── */
  dashboard: (
    <>
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".22" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".22" />
    </>
  ),

  /* ── Accounting ── */
  chart: (
    <>
      <rect x="1" y="10" width="3.5" height="5" rx="1" fill="currentColor" opacity=".22" />
      <rect x="6.25" y="6" width="3.5" height="9" rx="1" fill="currentColor" opacity=".55" />
      <rect x="11.5" y="2" width="3.5" height="13" rx="1" fill="currentColor" />
    </>
  ),
  invoice: (
    <>
      <rect x="2" y="1" width="12" height="14" rx="2" fill="currentColor" opacity=".18" />
      <path d="M9 1v3.5a1 1 0 001 1H14" stroke="currentColor" strokeWidth="1.1" fill="none" opacity=".4" strokeLinecap="round" />
      <rect x="4" y="7" width="8" height="1.3" rx=".65" fill="currentColor" />
      <rect x="4" y="9.5" width="8" height="1.3" rx=".65" fill="currentColor" opacity=".55" />
      <rect x="4" y="12" width="5" height="1.3" rx=".65" fill="currentColor" opacity=".3" />
    </>
  ),
  card: (
    <>
      <rect x="1" y="3" width="14" height="10" rx="2" fill="currentColor" opacity=".2" />
      <rect x="1" y="6" width="14" height="2.5" fill="currentColor" opacity=".45" />
      <rect x="3" y="10" width="3.5" height="1.5" rx=".75" fill="currentColor" />
      <circle cx="13" cy="10.75" r="1.25" fill="currentColor" opacity=".45" />
    </>
  ),
  users: (
    <>
      <circle cx="5.5" cy="5.5" r="3" fill="currentColor" opacity=".22" />
      <path d="M0.5 14c0-2.5 2.2-4.5 5-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".3" />
      <circle cx="10.5" cy="5.5" r="3.5" fill="currentColor" />
      <path d="M7 14c0-2.8 1.5-4.5 3.5-4.5S14 11.2 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </>
  ),

  bill: (
    <>
      <rect x="2" y="1" width="12" height="14" rx="2" fill="currentColor" opacity=".18" />
      <rect x="4" y="4" width="8" height="1.2" rx=".6" fill="currentColor" />
      <rect x="4" y="6.5" width="8" height="1.2" rx=".6" fill="currentColor" opacity=".5" />
      <rect x="4" y="9" width="5" height="1.2" rx=".6" fill="currentColor" opacity=".3" />
      <path d="M10 11.5l1.5 1.5 2.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  journal: (
    <>
      <rect x="3" y="1" width="11" height="14" rx="2" fill="currentColor" opacity=".18" />
      <rect x="1" y="3" width="3" height="10" rx="1" fill="currentColor" opacity=".35" />
      <rect x="5.5" y="4" width="6" height="1.2" rx=".6" fill="currentColor" />
      <rect x="5.5" y="6.5" width="6" height="1.2" rx=".6" fill="currentColor" opacity=".5" />
      <rect x="5.5" y="9" width="4" height="1.2" rx=".6" fill="currentColor" opacity=".3" />
    </>
  ),
  report: (
    <>
      <rect x="2" y="1" width="12" height="14" rx="2" fill="currentColor" opacity=".15" />
      <rect x="4" y="3.5" width="3.5" height="5" rx="1" fill="currentColor" opacity=".3" />
      <rect x="8.5" y="5.5" width="3.5" height="3" rx="1" fill="currentColor" opacity=".5" />
      <path d="M4 12h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".4" fill="none" />
      <path d="M5.75 8.5V5M10.25 8.5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </>
  ),
  bank: (
    <>
      <path d="M8 1.5L1 5.5h14L8 1.5z" fill="currentColor" opacity=".35" />
      <rect x="1" y="13" width="14" height="2" rx=".5" fill="currentColor" opacity=".25" />
      <rect x="3" y="6" width="2" height="7" rx=".5" fill="currentColor" opacity=".5" />
      <rect x="7" y="6" width="2" height="7" rx=".5" fill="currentColor" />
      <rect x="11" y="6" width="2" height="7" rx=".5" fill="currentColor" opacity=".5" />
    </>
  ),
  compliance: (
    <>
      <rect x="2" y="1" width="12" height="14" rx="2" fill="currentColor" opacity=".15" />
      <path d="M5.5 8l2 2 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="4" y="3" width="8" height="1.2" rx=".6" fill="currentColor" opacity=".4" />
      <rect x="4" y="12" width="5" height="1.2" rx=".6" fill="currentColor" opacity=".3" />
    </>
  ),

  /* ── CRM ── */
  target: (
    <>
      <circle cx="8" cy="8" r="7" fill="currentColor" opacity=".1" />
      <circle cx="8" cy="8" r="5" fill="currentColor" opacity=".2" />
      <circle cx="8" cy="8" r="2.5" fill="currentColor" />
      <path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".35" fill="none" />
    </>
  ),
  leads: (
    <>
      <path d="M2 1h12L11.5 6.5H4.5L2 1z" fill="currentColor" opacity=".22" />
      <path d="M4.5 6.5L8 15l3.5-8.5H4.5z" fill="currentColor" />
      <rect x="3.5" y="6.5" width="9" height="1" rx=".5" fill="currentColor" opacity=".4" />
    </>
  ),
  briefcase: (
    <>
      <rect x="1" y="6" width="14" height="9" rx="2" fill="currentColor" opacity=".22" />
      <path d="M5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M1 10h14" stroke="currentColor" strokeWidth="1" opacity=".4" fill="none" />
      <rect x="6.5" y="9" width="3" height="2" rx=".5" fill="currentColor" opacity=".7" />
    </>
  ),
  clipboard: (
    <>
      <rect x="2" y="3" width="12" height="12" rx="2" fill="currentColor" opacity=".18" />
      <rect x="5.5" y="1.5" width="5" height="3" rx="1" fill="currentColor" opacity=".5" />
      <rect x="4" y="7.5" width="8" height="1.2" rx=".6" fill="currentColor" />
      <rect x="4" y="10" width="8" height="1.2" rx=".6" fill="currentColor" opacity=".5" />
      <rect x="4" y="12.5" width="5" height="1.2" rx=".6" fill="currentColor" opacity=".3" />
    </>
  ),

  /* ── Inventory ── */
  box: (
    <>
      <path d="M8 1.5L1.5 5v6L8 14.5 14.5 11V5L8 1.5z" fill="currentColor" opacity=".18" />
      <path d="M8 1.5L1.5 5 8 8.5l6.5-3.5L8 1.5z" fill="currentColor" opacity=".45" />
      <path d="M8 8.5V14.5M1.5 5v6M14.5 5v6M8 8.5l6.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
    </>
  ),
  building: (
    <>
      <rect x="2" y="5" width="12" height="10" rx="1" fill="currentColor" opacity=".18" />
      <path d="M2 8h12" stroke="currentColor" strokeWidth="1" opacity=".35" fill="none" />
      <rect x="3.5" y="9.5" width="3" height="2.5" rx=".5" fill="currentColor" opacity=".45" />
      <rect x="9.5" y="9.5" width="3" height="2.5" rx=".5" fill="currentColor" opacity=".45" />
      <rect x="6" y="12" width="4" height="3" rx=".5" fill="currentColor" />
      <path d="M1 5L8 2l7 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  'arrows-rotate': (
    <>
      <path d="M13.5 3A7 7 0 003 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".3" />
      <path d="M2.5 13A7 7 0 0013 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M11.5 1.5l2.5 2-2.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity=".3" />
      <path d="M4.5 14.5l-2.5-2 2.5-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  /* ── HR ── */
  home: (
    <>
      <path d="M8 2L2 7h1.5v7h3.5v-3.5h2V14h3.5V7H14L8 2z" fill="currentColor" opacity=".22" />
      <path d="M8 2L2 7h1.5v7h3.5v-3.5h2V14h3.5V7H14L8 2z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
    </>
  ),
  person: (
    <>
      <circle cx="8" cy="5" r="3.5" fill="currentColor" opacity=".25" />
      <circle cx="8" cy="5" r="2" fill="currentColor" />
      <path d="M2 15c0-3.3 2.7-5.5 6-5.5S14 11.7 14 15" fill="currentColor" opacity=".28" />
    </>
  ),
  hierarchy: (
    <>
      <circle cx="8" cy="2.5" r="2" fill="currentColor" />
      <path d="M8 4.5v3M8 7.5H4M8 7.5h4M4 7.5v2.5M12 7.5v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity=".4" />
      <circle cx="4" cy="12" r="2" fill="currentColor" opacity=".5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity=".5" />
    </>
  ),
  calendar: (
    <>
      <rect x="1" y="3" width="14" height="12" rx="2" fill="currentColor" opacity=".18" />
      <rect x="1" y="3" width="14" height="4.5" rx="2" fill="currentColor" opacity=".35" />
      <rect x="1" y="5.5" width="14" height="2" fill="currentColor" opacity=".1" />
      <rect x="4" y="1.5" width="1.5" height="3.5" rx=".75" fill="currentColor" />
      <rect x="10.5" y="1.5" width="1.5" height="3.5" rx=".75" fill="currentColor" />
      <circle cx="4.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="8" cy="10.5" r="1" fill="currentColor" opacity=".5" />
      <circle cx="11.5" cy="10.5" r="1" fill="currentColor" opacity=".3" />
    </>
  ),
  clock: (
    <>
      <circle cx="8" cy="8" r="7" fill="currentColor" opacity=".18" />
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".5" />
      <path d="M8 4v4.5l3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  receipt: (
    <>
      <path d="M3 1.5h10a1 1 0 011 1v12l-2-1-2 1-2-1-2 1-2-1-2 1V2.5a1 1 0 011-1z" fill="currentColor" opacity=".18" />
      <rect x="5" y="5" width="6" height="1.2" rx=".6" fill="currentColor" />
      <rect x="5" y="7.5" width="6" height="1.2" rx=".6" fill="currentColor" opacity=".5" />
      <rect x="5" y="10" width="4" height="1.2" rx=".6" fill="currentColor" opacity=".3" />
    </>
  ),
  banknote: (
    <>
      <rect x="1" y="4" width="14" height="8" rx="2" fill="currentColor" opacity=".18" />
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <rect x="2.5" y="4" width="2" height="8" rx="1" fill="currentColor" opacity=".2" />
      <rect x="11.5" y="4" width="2" height="8" rx="1" fill="currentColor" opacity=".2" />
    </>
  ),

  /* ── WhatsApp ── */
  whatsapp: (
    <>
      <path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8c0 1.3.4 2.6 1.1 3.7L1.5 14.5l2.9-.9C5.4 14.2 6.7 14.5 8 14.5c3.6 0 6.5-2.9 6.5-6.5S11.6 1.5 8 1.5z" fill="currentColor" opacity=".2" />
      <path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8c0 1.3.4 2.6 1.1 3.7L1.5 14.5l2.9-.9C5.4 14.2 6.7 14.5 8 14.5c3.6 0 6.5-2.9 6.5-6.5S11.6 1.5 8 1.5z" stroke="currentColor" strokeWidth="1.1" fill="none" />
      <path d="M5.8 6.3c.1-.3.4-.5.7-.5h.1c.3 0 .5.2.6.4l.4 1c.1.3 0 .5-.2.7l-.2.2a2.9 2.9 0 001.7 1.7l.2-.2c.2-.2.4-.3.7-.2l1 .4c.2.1.4.3.4.6v.1c0 .4-.2.8-.6.9-1.8.6-4-1.5-3.4-3.3" fill="currentColor" opacity=".85" />
    </>
  ),

  /* ── Admin ── */
  shield: (
    <>
      <path d="M8 1.5L2 4v4.5c0 3.5 2.5 6 6 7 3.5-1 6-3.5 6-7V4L8 1.5z" fill="currentColor" opacity=".2" />
      <path d="M8 1.5L2 4v4.5c0 3.5 2.5 6 6 7 3.5-1 6-3.5 6-7V4L8 1.5z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      <path d="M6 8l1.5 1.5L10.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  /* ── Settings ── */
  gear: (
    <>
      <circle cx="8" cy="8" r="7" fill="currentColor" opacity=".12" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M3.6 12.4l1.4-1.4M11 5l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".4" fill="none" />
      <circle cx="8" cy="8" r="2.5" fill="currentColor" />
    </>
  ),
  key: (
    <>
      <circle cx="5.5" cy="7" r="4" fill="currentColor" opacity=".22" />
      <circle cx="5.5" cy="7" r="4" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <circle cx="5.5" cy="7" r="1.5" fill="currentColor" />
      <path d="M9 9.5L14 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M12 12.5l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".4" />
    </>
  ),
  'audit-log': (
    <>
      <rect x="2" y="1.5" width="12" height="13" rx="2" fill="currentColor" opacity=".15" />
      <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".5" fill="none" />
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity=".2" />
      <path d="M12 10.5v2l1 .5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </>
  ),
}

export function NavIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-[18px] h-[18px] shrink-0" aria-hidden>
      {ICONS[name] ?? <circle cx="8" cy="8" r="5" fill="currentColor" opacity=".4" />}
    </svg>
  )
}
