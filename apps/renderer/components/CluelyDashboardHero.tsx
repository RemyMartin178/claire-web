'use client';

import { ChevronRight } from 'lucide-react';

interface DashboardHeroProps {
  greeting?: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

/**
 * Cluely-style dashboard hero block.
 * Combines:
 *  - .cluely-hero-text (radial-gradient text with glow)
 *  - .cluely-cta-glass (premium glass CTA with brightness hover)
 *  - .cluely-glow-dot (small blue glow accent)
 */
export default function CluelyDashboardHero({
  greeting = 'Bonjour',
  subtitle = 'Prêt pour ta prochaine réunion ?',
  ctaLabel = 'Démarrer Claire',
  onCta,
}: DashboardHeroProps) {
  return (
    <section className="w-full max-w-[52rem] mx-auto py-12 flex flex-col items-center text-center">
      {/* Gradient logo title */}
      <h1 className="cluely-hero-text" style={{ fontSize: '3rem', lineHeight: 1.05 }}>
        {greeting}
      </h1>

      <p className="text-[15px] text-neutral-500 dark:text-neutral-400 mt-2 mb-8 max-w-md">
        {subtitle}
      </p>

      {/* Premium glass CTA */}
      <button
        onClick={onCta}
        className="cluely-cta-glass !h-12 !px-5 !text-[14px] !font-medium"
      >
        <span className="cluely-glow-dot !size-5" />
        <span>{ctaLabel}</span>
        <ChevronRight size={16} className="opacity-60" />
      </button>
    </section>
  );
}
