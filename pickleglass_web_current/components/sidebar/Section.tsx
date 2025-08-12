'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

interface SectionProps {
  title: string
  children: React.ReactNode
  collapsible?: boolean
  showCount?: boolean
  isCollapsed?: boolean
  onToggle?: () => void
}

export function Section({ 
  title, 
  children, 
  collapsible = false, 
  showCount = false,
  isCollapsed = false,
  onToggle 
}: SectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        disabled={!collapsible}
        className={clsx(
          'w-full flex items-center justify-between text-gray-300 hover:text-white py-2 transition-colors',
          !collapsible && 'cursor-default'
        )}
      >
        <span className="text-sm font-medium">{title}</span>
        {collapsible && (
          <ChevronDown 
            className={clsx(
              'w-4 h-4 transition-transform',
              isCollapsed && 'rotate-[-90deg]'
            )} 
          />
        )}
      </button>
      {!isCollapsed && children}
    </div>
  )
}
