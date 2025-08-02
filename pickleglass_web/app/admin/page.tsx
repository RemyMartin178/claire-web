"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPanel() {
  const router = useRouter()
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('isAdmin') !== 'true') {
      router.push('/admin-login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <div className="bg-[#232329] p-8 rounded-xl shadow-lg border border-[#3a3a4a]">
        <h1 className="text-2xl font-bold mb-4">Panel Admin (caché)</h1>
        <p>Bienvenue dans l'espace d'administration caché.</p>
      </div>
    </div>
  )
}