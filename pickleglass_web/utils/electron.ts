'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    api?: {
      dashboard?: {
        getUser?: () => Promise<unknown>
        startClaire?: () => Promise<unknown>
        minimizeWindow?: () => Promise<unknown>
        maximizeWindow?: () => Promise<unknown>
        closeWindow?: () => Promise<unknown>
        onUserChanged?: (cb: (...args: any[]) => void) => void
        removeUserChanged?: () => void
      }
      common?: {
        startFirebaseAuth?: () => Promise<unknown>
        firebaseLogout?: () => Promise<unknown>
        openExternal?: (url: string) => Promise<unknown>
      }
    }
  }
}

export function isElectronBridgeAvailable(): boolean {
  if (typeof window === 'undefined') return false

  return Boolean(
    window.api?.dashboard?.getUser &&
    window.api?.common?.startFirebaseAuth
  )
}

export function getElectronLoginPath(): string {
  return '/electron-login'
}

export function useElectronRuntime(): boolean | null {
  const [isElectron, setIsElectron] = useState<boolean | null>(null)

  useEffect(() => {
    setIsElectron(isElectronBridgeAvailable())
  }, [])

  return isElectron
}
