'use client'

export function SidebarCollapsed() {
  const logMenuClick = (_?: any) => {}
  return (
    <aside
      className="h-screen w-[var(--sidebar-rail-width)] flex flex-col justify-between border-r border-[var(--sidebar-border)]"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* icons stack */}
      <div className="flex flex-col items-center gap-2 py-3">
        <button onClick={() => logMenuClick('new_chat')} className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] leading-none" title="Nouvelle conversation">
          <span className="text-lg">＋</span>
        </button>
        <button onClick={() => logMenuClick('search')} className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)]" title="Rechercher">
          <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0" aria-hidden="true"></svg>
        </button>
        <button onClick={() => logMenuClick('library')} className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)]" title="Bibliothèque">
          <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0" aria-hidden="true"></svg>
        </button>
      </div>

      {/* profile compact */}
      <div className="p-2 border-t border-[var(--sidebar-border)]">
        <button className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)]" title="Profil">
          <div className="h-6 w-6 rounded-full grid place-items-center bg-[var(--avatar-bg)] text-[var(--text-primary)] text-xs font-medium">NC</div>
        </button>
      </div>
    </aside>
  )
}
