'use client'

import { useEffect } from 'react'
import { motion, Variants } from 'framer-motion'
import { Page } from '@/components/Page'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, staggerChildren: 0.1 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  }
}

const pathVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }
  }
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Page bleed={true} className="bg-white">
      <div className="min-h-screen flex flex-col items-center justify-start bg-white px-6 pt-[18vh] select-none overflow-hidden">
        <motion.div
          className="max-w-sm w-full flex flex-col items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="mb-14" variants={itemVariants}>
            <svg
              className="w-16 h-16"
              style={{ color: '#dc2626' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path d="M18 6L6 18M6 6l12 12" variants={pathVariants} />
            </svg>
          </motion.div>

          <motion.p
            className="text-[11px] font-semibold tracking-widest uppercase text-[#1562df] mb-4"
            variants={itemVariants}
          >
            Une erreur est survenue
          </motion.p>

          <motion.h1
            className="text-[28px] font-medium tracking-tight text-[#1D1D1F] mb-3 text-center"
            variants={itemVariants}
          >
            Quelque chose s'est mal passé
          </motion.h1>

          <motion.p
            className="text-[#86868B] text-[17px] font-normal leading-relaxed text-center mb-12"
            variants={itemVariants}
          >
            Une erreur inattendue s'est produite. Vous pouvez réessayer ou revenir à l'accueil.
          </motion.p>

          <motion.div className="flex flex-col items-center gap-4" variants={itemVariants}>
            <button
              onClick={reset}
              className="px-6 py-2.5 rounded-lg text-[14px] font-medium text-white transition-opacity hover:opacity-80"
              style={{ background: 'radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0, #0c26a8 100%)' }}
            >
              Réessayer
            </button>
            <a
              href="/"
              className="text-[13px] font-medium text-[#1D1D1F] underline underline-offset-4 hover:opacity-60 transition-opacity"
            >
              Retour à l'accueil
            </a>
          </motion.div>

          {error.digest && (
            <motion.p
              className="mt-16 text-[10px] font-mono text-neutral-300"
              variants={itemVariants}
            >
              {error.digest}
            </motion.p>
          )}
        </motion.div>
      </div>
    </Page>
  )
}
