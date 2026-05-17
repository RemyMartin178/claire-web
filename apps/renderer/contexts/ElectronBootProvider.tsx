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

    let cancelled = false
    const waitForStablePaint = () => {
      const afterFrames = new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.setTimeout(resolve, 80)
          })
        })
      })
      const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 260))
      return Promise.race([afterFrames, timeout])
    }

    const signalBootReady = async () => {
      await waitForStablePaint()
      if (cancelled) return

      if (isAuthenticated) {
        api.dashboardReady().catch(() => {})
      } else {
        api.needsLogin().catch(() => {})
      }
    }

    void signalBootReady()

    return () => {
      cancelled = true
    }
  }, [loading, isAuthenticated])

  return <>{children}</>
}
