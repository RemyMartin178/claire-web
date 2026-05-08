'use client'

import { useState } from 'react'
import { Search, Command } from 'lucide-react'
import Avatar from './Avatar'
import { useAuth } from '@/contexts/AuthContext'

interface DashboardHeaderProps {
  onSearchClick: () => void
  onSettingsClick: () => void
}

export default function DashboardHeader({ onSearchClick, onSettingsClick }: DashboardHeaderProps) {
  const { user: userInfo } = useAuth()

  const getUserDisplayName = () => {
    if (!userInfo) return 'I'
    if (userInfo.display_name) return userInfo.display_name
    if (userInfo.email) return userInfo.email.split('@')[0]
    return 'U'
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-neutral-100 dark:bg-black/80 dark:border-neutral-800">
      <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-[8px] bg-[#0f1115] flex items-center justify-center p-1.5 shadow-sm">
            <svg viewBox="0 0 128 128" className="w-full h-full">
              <defs>
                <linearGradient id="header-g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6EE7F9"/>
                  <stop offset="100%" stopColor="#38BDF8"/>
                </linearGradient>
              </defs>
              <circle cx="64" cy="64" r="44" fill="none" stroke="url(#header-g)" strokeWidth="10"/>
              <path d="M86 82c-6 8-15 12-26 12-18 0-32-14-32-32s14-32 32-32c11 0 20 4 26 12" fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="10" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-[17px] font-bold text-black dark:text-white tracking-tight">Claire</span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl px-4">
          <button
            onClick={onSearchClick}
            className="w-full flex items-center gap-3 px-3 h-10 bg-neutral-100 hover:bg-neutral-200/70 dark:bg-neutral-800 dark:hover:bg-neutral-700/70 rounded-xl transition-all group outline-none"
          >
            <Search className="w-4 h-4 text-neutral-400 group-hover:text-neutral-500 transition-colors" />
            <span className="text-[14px] text-neutral-400 group-hover:text-neutral-500 font-medium transition-colors">
              Rechercher dans vos conversations...
            </span>
            <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 opacity-60">
              <Command className="w-3 h-3 text-neutral-500" />
              <span className="text-[10px] font-bold text-neutral-500">K</span>
            </div>
          </button>
        </div>

        {/* User Profile */}
        <div className="shrink-0 flex items-center">
          <button
            onClick={onSettingsClick}
            className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-neutral-200 dark:hover:ring-neutral-700 transition-all shadow-sm overflow-hidden"
          >
            <Avatar name={getUserDisplayName()} size="sm" />
          </button>
        </div>
      </div>
    </header>
  )
}
