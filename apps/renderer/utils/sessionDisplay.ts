/**
 * Centralized session phase + title derivation, matching Cluely's flow:
 *
 *   !ended_at                → 'ongoing'    (recording active)
 *   ended_at + no summary    → 'analyzing'  (Claire is generating the summary)
 *   ended_at + summary       → 'completed'
 *
 * Every page (activity list, details, etc.) must use these helpers — no more
 * page-level fallbacks like "Discussion avec Claire" that drift over time.
 */

import type { Session, Summary } from './api';

export type SessionPhase = 'ongoing' | 'analyzing' | 'completed';

const GENERIC_TITLES = [
  'Session @',
  'Session Sans Titre',
  'Discussion avec Claire',
  'Résumé en cours',
  'Sans titre',
  'En cours',
  'New Session',
  'La discussion porte sur',
  'La conversation porte sur',
];

export function getSessionPhase(
  session?: Session | null,
  summary?: Summary | null
): SessionPhase {
  if (!session?.ended_at) return 'ongoing';
  if (session.ended_at && !summary) return 'analyzing';
  return 'completed';
}

export function getSessionStatusLabel(phase: SessionPhase): string {
  if (phase === 'ongoing') return 'Session en cours';
  if (phase === 'analyzing') return 'Résumé en cours';
  return 'Terminé';
}

export function getSessionBadgeLabel(
  phase: SessionPhase,
  durationStr: string
): string {
  if (phase === 'ongoing') return 'En cours';
  if (phase === 'analyzing') return 'Analyse';
  return durationStr;
}

export function isGenericSessionTitle(title?: string | null): boolean {
  const value = title?.trim();
  if (!value) return true;
  return GENERIC_TITLES.some((generic) => value.includes(generic));
}

export function cleanSummaryTitle(value?: string | null): string {
  if (!value) return '';
  return value
    .split('\n')[0]
    .replace(/\*\*/g, '')
    .replace(
      /^(La discussion porte sur|La conversation porte sur|Ce \w+ porte sur|Le sujet est)\s*/i,
      ''
    )
    .trim();
}

/**
 * Returns the display title to show in the UI.
 *
 * Priority:
 *  1. session.title if it's not a generic placeholder
 *  2. cleaned-up first line of summary.tldr (capped at 40 chars)
 *  3. phase-dependent fallback ("Session en cours" or "Sans titre")
 *
 * Importantly, this never returns "Discussion avec Claire" anymore.
 */
export function getSessionDisplayTitle(
  session?: Session | null,
  summary?: Summary | null
): string {
  const trimmed = session?.title?.trim();
  if (trimmed && !isGenericSessionTitle(trimmed)) {
    return trimmed;
  }

  const summaryTitle = cleanSummaryTitle(summary?.tldr);
  if (summaryTitle) {
    return summaryTitle.length > 40
      ? summaryTitle.substring(0, 40).trimEnd() + '…'
      : summaryTitle;
  }

  const phase = getSessionPhase(session, summary);
  if (phase === 'ongoing') return 'Session en cours';
  return 'Sans titre';
}
