'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowRight, Check } from 'lucide-react'
import { motion, Variants } from 'framer-motion'
import { Page } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 1,
      staggerChildren: 0.12
    }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
        duration: 0.8, 
        ease: [0.16, 1, 0.3, 1] 
    }
  }
}

const checkVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { 
    pathLength: 1, 
    opacity: 1,
    transition: { 
      duration: 1.2, 
      ease: [0.16, 1, 0.3, 1],
      delay: 0.3
    }
  }
}

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [countdown, setCountdown] = useState(5)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const sessionId = searchParams.get('session_id')
  const planName = searchParams.get('plan') || 'Plus'
  const plan = planName.charAt(0).toUpperCase() + planName.slice(1).toLowerCase()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login')
    }
  }, [loading, user, router])

  useEffect(() => {
    const syncSession = async () => {
      if (!sessionId) return
      // Retry up to 3 times with exponential backoff — webhook may be delayed
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch('/api/stripe/sync-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          })
          if (res.ok) break
        } catch {}
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
      // Clear stale subscription cache so useSubscription fetches fresh data
      localStorage.removeItem('subscription_cache')
    }
    syncSession()

    const deeplink = `claire://billing-success${sessionId ? `?session_id=${sessionId}` : ''}`
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsRedirecting(true)
          clearInterval(timer)
          window.location.href = deeplink
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [sessionId])

  const handleRedirectToApp = () => {
    setIsRedirecting(true)
    window.location.href = `claire://billing-success${sessionId ? `?session_id=${sessionId}` : ''}`
  }

  if (loading || !user) return null

  return (
    <Page bleed={true} className="bg-white">
      <div className="min-h-screen flex flex-col items-center justify-start bg-white px-6 pt-[18vh] select-none overflow-hidden">
        <motion.div 
          className="max-w-sm w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-col items-center">
            {/* Minimalist Checkmark Icon */}
            <motion.div 
              className="mb-14"
              variants={itemVariants}
            >
              <svg
                className="w-16 h-16"
                style={{ color: '#1562df' }}
                viewBox="0 0 24 24"
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <motion.path 
                  d="M20 6L9 17L4 12" 
                  variants={checkVariants}
                />
              </svg>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              className="text-[28px] font-medium tracking-tight text-[#1D1D1F] mb-3 text-center"
              variants={itemVariants}
            >
              Paiement confirmé
            </motion.h1>

            {/* Description */}
            <motion.p 
              className="text-[#86868B] text-[17px] font-normal leading-relaxed text-center mb-16"
              variants={itemVariants}
            >
              Votre abonnement Claire {plan} est maintenant actif. Bienvenue dans l'expérience premium.
            </motion.p>

            {/* Simple Text Countdown + Manual Redirect */}
            <motion.div className="w-full flex flex-col items-center gap-1.5" variants={itemVariants}>
              <p className="text-[14px] font-medium text-[#86868B] text-center">
                {isRedirecting ? "Redirection en cours..." : `Redirection automatique dans ${countdown}s`}
              </p>
              <button 
                onClick={handleRedirectToApp}
                className="text-[13px] font-medium text-[#1D1D1F] underline underline-offset-4 hover:opacity-60 transition-opacity"
              >
                Cliquer ici si vous n'êtes pas redirigé
              </button>
            </motion.div>

            {/* Micro Metadata */}
            {sessionId && (
              <motion.div 
                className="mt-20 opacity-0"
                variants={itemVariants}
              >
                <p className="text-[10px] font-mono text-neutral-300">
                   {sessionId.substring(0, 12)}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </Page>
  )
}
