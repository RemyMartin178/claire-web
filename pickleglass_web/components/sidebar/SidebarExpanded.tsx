'use client'

export function SidebarExpanded() {
  return (
    <aside
      className="flex flex-col h-screen w-[var(--sidebar-width)] border-r"
      style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
    >
      {/* header sticky */}
      <header className="sticky top-0 z-10 px-3 pt-3 pb-2 bg-[var(--sidebar-bg)]">
        <button
          className="w-full h-10 rounded-xl border flex items-center justify-center gap-2 hover:bg-[var(--surface-hover)] transition"
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          <span className="text-sm">New Chat</span>
          <span className="text-lg leading-none">＋</span>
        </button>
      </header>

      {/* nav scrollable */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-1" aria-label="Historique de chat">
        <a className="group flex items-center gap-2 px-2 h-9 rounded-lg hover:bg-[var(--surface-hover)]" href="#">
          <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0"></svg>
          <span className="truncate text-sm">Conversation 1</span>
        </a>
      </nav>

      {/* footer sticky */}
      <footer
        className="sticky bottom-0 z-10 px-2 py-2 border-t"
        style={{ borderColor: 'var(--sidebar-border)', backgroundColor: 'var(--sidebar-bg)' }}
      >
        <button className="w-full flex items-center gap-2 px-2 h-[52px] rounded-lg hover:bg-[var(--surface-hover)]">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
            style={{ backgroundColor: 'var(--avatar-bg)', color: 'var(--text-primary)' }}
          >
            NC
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Natanael Charles
            </p>
            <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
              Claire Gratuit
            </p>
          </div>
          <span className="text-lg leading-none">…</span>
        </button>
      </footer>
    </aside>
  )
}


