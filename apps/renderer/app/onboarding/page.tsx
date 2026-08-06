'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { completeOnboarding } from '@/utils/api'
import { ONBOARDING_COMPLETED_EVENT } from '@/components/ConditionalLayout'

export default function OnboardingPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStart = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await completeOnboarding()
      window.dispatchEvent(new Event(ONBOARDING_COMPLETED_EVENT))
      router.replace('/activity')
    } catch {
      setError("Impossible d'enregistrer votre progression. Vérifiez votre connexion puis réessayez.")
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-8 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/claire_logo-removebg-preview.png"
            alt="Claire"
            className="h-12 w-12 rounded-xl"
          />
          <span className="text-xl font-medium tracking-tight text-foreground">Claire</span>
        </div>

        <h1 className="mb-3 text-3xl font-medium tracking-tight text-foreground">
          Bienvenue sur Claire
        </h1>
        <p className="mb-10 text-base leading-relaxed text-muted-foreground">
          Votre assistant de réunion est prêt. Vous pourrez ajuster vos préférences à tout moment
          dans les paramètres.
        </p>

        <button
          onClick={() => { void handleStart() }}
          disabled={saving}
          className="btn-apple-premium btn-hero-cta-premium group w-full max-w-xs px-10"
          style={{ opacity: saving ? 0.92 : 1, cursor: saving ? 'default' : 'pointer' }}
        >
          <div className="btn-primary-shine" />
          <div className="blurred-border-black" />
          <span className="relative z-10 flex items-center justify-center">
            {saving ? (
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
                aria-label="Enregistrement en cours"
              />
            ) : (
              'Commencer'
            )}
          </span>
        </button>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-500 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
