"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = () => {
    if (code === 'letmein2024') { // Mets ton code secret ici
      sessionStorage.setItem('isAdmin', 'true')
      router.push('/admin')
    } else {
      setError('Code incorrect')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#202123]">
      <div className="bg-[#232329] p-8 rounded-xl shadow-lg border border-[#3a3a4a]">
        <h1 className="text-2xl font-bold text-white mb-4">Espace Admin</h1>
        <input
          type="password"
          placeholder="Code admin"
          value={code}
          onChange={e => setCode(e.target.value)}
          className="w-full mb-4 px-4 py-2 rounded bg-[#2a2a32] border border-[#3a3a4a] text-white"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-accent-light text-white py-2 rounded font-medium"
        >
          Entrer
        </button>
        {error && <div className="text-red-400 mt-2">{error}</div>}
      </div>
    </div>
  )
}