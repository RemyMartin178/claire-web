"use client"

import * as React from "react"
import * as Popover from "@radix-ui/react-popover"
import { LogOut, Settings, SlidersHorizontal, Gem } from "lucide-react"

export type ProfilePlan = "Claire Pro" | "Claire Gratuit"

export interface ProfileMenuProps {
  onLogout: () => void
  name?: string
  email?: string
  plan?: ProfilePlan
  avatarUrl?: string | null
  // Optional: width of the sidebar for strict alignment. If not provided, the component stretches to its container width
  sidebarWidthPx?: number
}

export default function ProfileMenu({
  onLogout,
  name = "Natanael Dev",
  email = "user@example.com",
  plan = "Claire Gratuit",
  avatarUrl = null,
  sidebarWidthPx,
}: ProfileMenuProps) {
  const [open, setOpen] = React.useState(false)

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

  const initials = React.useMemo(() => {
    if (avatarUrl) return ""
    const parts = name.split(" ").filter(Boolean)
    if (parts.length === 0) return "U"
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U"
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }, [name, avatarUrl])

  // Container to keep the menu strictly inside the sidebar
  // The parent that uses this component should be relative; but we provide a fallback wrapper here
  return (
    <div className="relative select-none" style={sidebarWidthPx ? { width: sidebarWidthPx } : undefined}>
      {/* Overlay supprimé (plus d'assombrissement du fond) */}

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
                     <button
             type="button"
             className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 hover:bg-hover-bg active:bg-active-bg focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2`}
             aria-expanded={open}
             aria-haspopup="menu"
           >
            {/* Avatar */}
            <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white text-sm overflow-hidden">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={name} src={avatarUrl} className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
                         <div className="min-w-0 flex-1">
               <div className="text-sm font-medium text-text-main truncate">{name}</div>
               <div className="text-xs text-text-secondary truncate">{plan}</div>
             </div>
            {/* Chevron removed as requested */}
          </button>
        </Popover.Trigger>

        {/* Content rendered inside the sidebar; no Portal to keep it within bounds */}
        <Popover.Content
          side="top"
          align="center"
          sideOffset={8}
          avoidCollisions={false}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="z-50 outline-none"
        >
                     <div
             role="menu"
             aria-label="Menu utilisateur"
             className="w-[var(--profile-menu-width,280px)] bg-card-bg text-text-main rounded-2xl shadow-large border border-sidebar-border p-3 animate-fade-in"
             style={{
               // Expand to container width with 16px lateral paddings to match sidebar paddings
               width: sidebarWidthPx ? sidebarWidthPx : undefined,
             }}
           >
                         {/* Email */}
             <div className="px-2 py-2 text-xs text-text-muted truncate" aria-hidden>
               {email}
             </div>

             {/* Items */}
             <nav className="mt-2 flex flex-col gap-1" aria-label="Actions">
              <MenuItem
                icon={<Gem className="w-4 h-4" />}
                label="Passer au plan supérieur"
                onSelect={() => {
                  setOpen(false)
                  // route outside (placeholder)
                  window.location.href = "/settings/billing"
                }}
              />
              <MenuItem
                icon={<SlidersHorizontal className="w-4 h-4" />}
                label="Personnaliser"
                onSelect={() => {
                  setOpen(false)
                  window.location.href = "/personalize"
                }}
              />
              <MenuItem
                id="profile-menu-settings"
                icon={<Settings className="w-4 h-4" />}
                label="Paramètres"
                onSelect={() => {
                  setOpen(false)
                  window.location.href = "/settings"
                }}
              />

                             <div className="my-2 border-t border-sidebar-border" />

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
        </Popover.Content>
      </Popover.Root>
    </div>
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
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 hover:bg-hover-bg active:bg-active-bg focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 ${
        variant === "danger"
          ? "text-red-400 hover:bg-red-500/10"
          : "text-text-main hover:bg-hover-bg"
      }`}
    >
      <span aria-hidden className="shrink-0 text-text-secondary">{icon}</span>
      <span className="truncate text-left flex-1">{label}</span>
    </button>
  )
}

// Simple fade-in animation
// Add in globals.css if not present:
// .animate-fade-in { animation: fadeIn 150ms ease-out; }
// @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
