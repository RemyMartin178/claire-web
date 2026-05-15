'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

export function ElectronBootProvider({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth()
  const signalledRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const api = (window as any).api?.electronBoot
    if (!api || signalledRef.current) return
    if (loading) return

    signalledRef.current = true

    if (isAuthenticated) {
      api.dashboardReady().catch(() => {})
    } else {
      api.needsLogin().catch(() => {})
    }
  }, [loading, isAuthenticated])

  return <>{children}</>
}
