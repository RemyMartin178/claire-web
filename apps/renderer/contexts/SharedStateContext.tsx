'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type SharedState = {
  appVersion: string | null
  signInStatus: 'loading' | 'signed-in' | 'signed-out'
  isHeaderLoaded: boolean
  isListenLoaded: boolean
  isDashboardLoaded: boolean
  showDashboard: boolean
  showHeader: boolean
  showListen: boolean
  dashboardFocusCount: number
  session: { id: string; startedAt: number } | null
  lastSessionId: string | null
  isListenRunning: boolean
  isCapturingScreenshot: boolean
  showSessionDisconnectedModal: boolean
}

type SharedStateAPI = {
  state: SharedState | null
  patch: (partial: Partial<SharedState>) => Promise<SharedState | null>
  ready: boolean
}

const FALLBACK_API: SharedStateAPI = {
  state: null,
  patch: async () => null,
  ready: false,
}

const SharedStateContext = createContext<SharedStateAPI>(FALLBACK_API)

export function SharedStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SharedState | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const api = (window as any)?.api?.sharedState
    if (!api) {
      // No bridge — likely web build outside Electron. Keep ready=false so
      // consumers can fall back to their existing IPC handlers.
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const initial = await api.get?.()
        if (!cancelled && initial) setState(initial)
      } catch {
        // ignore — main process may not be ready yet
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    const off = api.subscribe?.((next: SharedState) => {
      if (!cancelled) setState(next)
    })

    return () => {
      cancelled = true
      try { off?.() } catch { /* noop */ }
    }
  }, [])

  const patch = useCallback(async (partial: Partial<SharedState>) => {
    const api = (window as any)?.api?.sharedState
    if (!api?.patch) return null
    try {
      return await api.patch(partial)
    } catch {
      return null
    }
  }, [])

  return (
    <SharedStateContext.Provider value={{ state, patch, ready }}>
      {children}
    </SharedStateContext.Provider>
  )
}

export function useSharedState(): SharedStateAPI {
  return useContext(SharedStateContext)
}
