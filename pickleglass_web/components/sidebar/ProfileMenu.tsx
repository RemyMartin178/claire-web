"use client"

import * as React from "react"
import { LogOut, Settings, SlidersHorizontal, Gem } from "lucide-react"
import { useRouter } from "next/navigation"
import Avatar from '@/components/Avatar'
import { useAuth } from '@/contexts/AuthContext'

export type ProfilePlan = "Claire Pro" | "Claire Gratuit"

export interface ProfileMenuProps {
  onLogout: () => void
  name?: string
  email?: string
  plan?: ProfilePlan
  avatarUrl?: string | null
  // Optional: width of the sidebar for strict alignment. If not provided, the component stretches to its container width
  sidebarWidthPx?: number
  isSidebarCollapsed?: boolean
}

export default function ProfileMenu({
  onLogout,
  name = "Natanael Dev",
  email = "user@example.com",
  plan = "Claire Gratuit",
  avatarUrl = null,
  sidebarWidthPx,
  isSidebarCollapsed = false,
}: ProfileMenuProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { isAdmin } = useAuth()

  // Keyboard shortcuts when open
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "p") {
        // route to params
        const link = document.getElementById("profile-menu-settings") as HTMLButtonElement | null
        link?.click()
      }
      if (e.key.toLowerCase() === "l") {
        const btn = document.getElementById("profile-menu-logout") as HTMLButtonElement | null
        btn?.click()
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])


  return (
    <>
      {/* Profile Button */}
      <div className="relative select-none" style={sidebarWidthPx ? { width: sidebarWidthPx } : undefined}>
        <button
          type="button"
          onClick={() => {
            if (isSidebarCollapsed) return
            setOpen(!open)
          }}
          className={`w-full ${isSidebarCollapsed ? 'h-9 justify-center px-0' : 'h-[52px] px-3'} flex items-center gap-3 py-[10px] rounded-lg text-left transition-all duration-200 hover:bg-[color:var(--profile-hover)]`}
          aria-expanded={!isSidebarCollapsed && open}
          aria-haspopup="menu"
          aria-label={isSidebarCollapsed ? 'Profil' : 'Ouvrir le menu profil'}
          title={isSidebarCollapsed ? 'Profil' : 'Ouvrir le menu profil'}
        >
          {/* Avatar */}
          <div className="relative">
            <Avatar name={name} avatarUrl={avatarUrl} size="sm" />
            {isAdmin && (
              <span className="absolute -top-1 -right-1 text-[10px] px-[6px] py-[1px] rounded bg-green-600 text-white select-none">ADMIN</span>
            )}
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[color:var(--profile-text-primary)] truncate">{name}</div>
              <div className="text-xs text-[color:var(--profile-text-secondary)] truncate">{plan}</div>
            </div>
          )}
        </button>
      </div>

      {/* Global Overlay - hidden when collapsed */}
      {open && !isSidebarCollapsed && (
        <div className="fixed inset-0 z-[10000]" onClick={() => setOpen(false)}>
          <div
            className="absolute z-[10010] min-w-64 rounded-xl border shadow-xl p-2"
            style={{
              top: 'auto',
              bottom: '80px',
              left: '4px',
              maxWidth: '240px',
              backgroundColor: 'var(--profile-bg)',
              borderColor: 'var(--profile-border)',
              color: 'var(--profile-text-primary)'
            }}
            onClick={(e) => e.stopPropagation()}
            role="menu"
            aria-modal="true"
            aria-label="Menu utilisateur"
          >
            {/* Email */}
            <div className="px-2 py-2 text-xs text-neutral-400 truncate" aria-hidden>
              {email}
            </div>

            {/* Items */}
            <nav className="mt-2 flex flex-col gap-1" aria-label="Actions">
              <MenuItem
                icon={<Gem className="w-4 h-4" />}
                label="Plan supérieur"
                onSelect={() => {
                  setOpen(false)
                  router.push("/settings/billing")
                }}
              />
              <MenuItem
                icon={<SlidersHorizontal className="w-4 h-4" />}
                label="Personnaliser"
                onSelect={() => {
                  setOpen(false)
                  router.push("/personalize")
                }}
              />
              <MenuItem
                id="profile-menu-settings"
                icon={<Settings className="w-4 h-4" />}
                label="Paramètres"
                onSelect={() => {
                  setOpen(false)
                  router.push("/settings")
                }}
              />

              <div className="my-2 border-t" style={{ borderColor: 'var(--profile-border)' }} />

              <MenuItem
                id="profile-menu-logout"
                icon={<LogOut className="w-4 h-4" />}
                label="Se déconnecter"
                variant="danger"
                onSelect={() => {
                  setOpen(false)
                  onLogout?.()
                }}
              />
            </nav>
          </div>
        </div>
      )}
    </>
  )
}

interface MenuItemProps {
  id?: string
  icon: React.ReactNode
  label: string
  onSelect?: () => void
  variant?: "default" | "danger"
}

function MenuItem({ id, icon, label, onSelect, variant = "default" }: MenuItemProps) {
  return (
    <button
      id={id}
      role="menuitem"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 ${
        variant === "danger"
          ? "text-red-400 hover:bg-red-500/10"
          : "text-[color:var(--profile-text-primary)] hover:bg-[color:var(--profile-hover)]"
      }`}
    >
      <span aria-hidden className="shrink-0 text-[color:var(--profile-text-secondary)]">{icon}</span>
      <span className="truncate text-left flex-1">{label}</span>
    </button>
  )
}

// Simple fade-in animation
// Add in globals.css if not present:
// .animate-fade-in { animation: fadeIn 150ms ease-out; }
// @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
