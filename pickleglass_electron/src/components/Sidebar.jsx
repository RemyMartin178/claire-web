import React from 'react'

const IconActivity = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)
const IconHelp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

export default function Sidebar({ activePage, navigate, user }) {
  const navItems = [
    { id: 'activity', label: 'Mon activité', icon: <IconActivity /> },
    { id: 'calendar', label: 'Calendrier', icon: <IconCalendar /> },
  ]

  return (
    <nav className="no-drag w-[210px] shrink-0 border-r border-neutral-100 bg-white flex flex-col pt-3 pb-4 px-2 overflow-y-auto">
      <div className="flex flex-col gap-0.5">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium w-full text-left transition-colors ${
              activePage === item.id
                ? 'bg-neutral-100 text-[#1d1d1f]'
                : 'text-gray-500 hover:bg-neutral-50 hover:text-[#1d1d1f]'
            }`}
          >
            {item.icon}{item.label}
          </button>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-0.5">
        <button
          onClick={() => window?.api?.settings?.open?.()}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium w-full text-left text-gray-500 hover:bg-neutral-50 hover:text-[#1d1d1f] transition-colors"
        >
          <IconSettings /> Paramètres
        </button>
        <button
          onClick={() => window.open('https://support.clairia.app', '_blank')}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium w-full text-left text-gray-500 hover:bg-neutral-50 hover:text-[#1d1d1f] transition-colors"
        >
          <IconHelp /> Aide
        </button>

        <div className="mt-2 pt-3 px-1 border-t border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-[11px] font-semibold text-neutral-600 shrink-0">
              {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
            </div>
            <p className="text-[12px] font-medium text-[#1d1d1f] truncate">
              {user?.displayName || user?.email}
            </p>
          </div>
        </div>
      </div>
    </nav>
  )
}
