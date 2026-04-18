import React from 'react'

const IconActivity = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const IconHelp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

export default function Sidebar({ activePage, navigate, user }) {
  const navItems = [
    { id: 'activity', label: 'Mon activite', icon: <IconActivity /> },
    { id: 'calendar', label: 'Calendrier', icon: <IconCalendar /> },
  ]

  return (
    <nav className="no-drag w-[196px] shrink-0 bg-[#eef1f4] flex flex-col px-3 py-4 overflow-y-auto">
      <div className="px-2 pb-4">
        <div className="rounded-[18px] border border-white/70 bg-white/80 px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">Claire</p>
          <p className="mt-1 text-[16px] font-semibold text-[#111827] leading-tight">Dashboard Electron</p>
          <p className="mt-1 text-[11px] leading-4 text-[#6b7280]">Version compacte liee au renderer dedie.</p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium w-full text-left transition-colors ${
              activePage === item.id
                ? 'bg-white text-[#111827] shadow-[0_6px_18px_rgba(15,23,42,0.06)]'
                : 'text-[#667085] hover:bg-white/70 hover:text-[#111827]'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1 pt-4">
        <button
          onClick={() => window?.api?.settings?.open?.()}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium w-full text-left text-[#667085] hover:bg-white/70 hover:text-[#111827] transition-colors"
        >
          <IconSettings />
          Parametres
        </button>

        <button
          onClick={() => window.open('https://support.clairia.app', '_blank')}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium w-full text-left text-[#667085] hover:bg-white/70 hover:text-[#111827] transition-colors"
        >
          <IconHelp />
          Aide
        </button>

        <div className="mt-2 rounded-[18px] border border-white/70 bg-white/80 px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
              {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">Compte</p>
              <p className="text-[12px] font-medium text-[#111827] truncate">{user?.displayName || user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
