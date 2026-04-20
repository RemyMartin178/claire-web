'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getElectronLoginPath, useElectronRuntime } from '@/utils/electron'

export default function HomePage() {
  const router = useRouter()
  const { user, isAuthenticated, loading } = useAuth()
  const isElectronRuntime = useElectronRuntime()

  useEffect(() => {
    if (isElectronRuntime === null) return

    if (isAuthenticated && user && !loading) {
      router.replace('/activity')
    } else if (!loading && !isAuthenticated) {
      router.replace(isElectronRuntime ? getElectronLoginPath() : '/auth/login')
    }
  }, [user, isAuthenticated, loading, isElectronRuntime, router])

  if (loading || !isAuthenticated || isElectronRuntime === null) {
    return null
  }

  return null
}
