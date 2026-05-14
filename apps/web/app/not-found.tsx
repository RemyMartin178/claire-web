'use client'

import Link from 'next/link'
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

export default function NotFound() {
  return (
    <Page bleed={true} className="bg-white">
      <div className="min-h-screen flex flex-col items-center justify-start bg-white px-6 pt-[18vh] select-none overflow-hidden">
        <motion.div
          className="max-w-sm w-full flex flex-col items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            className="text-[11px] font-semibold tracking-widest uppercase text-[#1562df] mb-6"
            variants={itemVariants}
          >
            Erreur 404
          </motion.p>

          <motion.h1
            className="text-[28px] font-medium tracking-tight text-[#1D1D1F] mb-3 text-center"
            variants={itemVariants}
          >
            Page introuvable
          </motion.h1>

          <motion.p
            className="text-[#86868B] text-[17px] font-normal leading-relaxed text-center mb-12"
            variants={itemVariants}
          >
            Cette page n'existe pas ou a été déplacée.
          </motion.p>

          <motion.div variants={itemVariants}>
            <Link
              href="/"
              className="text-[13px] font-medium text-[#1D1D1F] underline underline-offset-4 hover:opacity-60 transition-opacity"
            >
              Retour à l'accueil
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </Page>
  )
}
