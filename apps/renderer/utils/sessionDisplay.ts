/**
 * Centralized session phase + title derivation, matching the Cluely-style flow:
 *
 *   !ended_at                         -> 'ongoing'
 *   ending hint                       -> 'ending'
 *   ended_at + summary/title loading  -> 'analyzing'
 *   local reveal hint                 -> 'revealing'
 *   ended_at + summaryStatus failed   -> 'failed'
 *   ended_at + summary/legacy status  -> 'completed'
 *
 * Every page (activity list, details, etc.) must use these helpers. Page-level
 * fallbacks like "Discussion avec Claire" are treated as placeholders, never
 * as final titles.
 */

import type { Session, Summary } from './api';

export type SessionPhase =
  | 'ongoing'
  | 'ending'
  | 'analyzing'
  | 'revealing'
  | 'completed'
  | 'failed';

export interface SessionDisplayState {
  isEnding?: boolean;
  isRevealing?: boolean;
}

const GENERIC_TITLES = [
  'Session @',
  'Session Sans Titre',
  'Discussion avec Claire',
  'Resume en cours',
  'Analyse en cours',
  'Fin de session',
  'Sans titre',
  'En cours',
  'New Session',
  'Untitled Session',
  'Untitled Meeting',
  'La discussion porte sur',
  'La conversation porte sur',
  'Ce resume porte sur',
  'Le sujet est',
];

const MAX_DERIVED_TITLE_LENGTH = 40;

function normalizeForComparison(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function getSessionPhase(
  session?: Session | null,
  summary?: Summary | null,
  displayState: SessionDisplayState = {}
): SessionPhase {
  if (displayState.isEnding) return 'ending';
  if (!session?.ended_at) return 'ongoing';

  const summaryStatus = session.summary_status;
  const titleStatus = session.title_status;

  if (summaryStatus === 'failed') return 'failed';
  if (displayState.isRevealing) return 'revealing';
  if (summary) return 'completed';
  if (summaryStatus === 'analyzing') return 'analyzing';
  if (titleStatus === 'streaming') return 'analyzing';

  return 'completed';
}

export function getSessionStatusLabel(phase: SessionPhase): string {
  if (phase === 'ongoing') return 'Session en cours';
  if (phase === 'ending') return 'Fin de session';
  if (phase === 'analyzing') return 'R\u00e9sum\u00e9 en cours';
  if (phase === 'revealing') return 'R\u00e9sum\u00e9 en cours';
  if (phase === 'failed') return 'R\u00e9sum\u00e9 indisponible';
  return 'Termin\u00e9';
}

export function getSessionBadgeLabel(
  phase: SessionPhase,
  durationStr: string
): string {
  if (phase === 'ongoing') return 'En cours';
  if (phase === 'ending') return 'Fin';
  if (phase === 'analyzing') return 'Analyse';
  if (phase === 'revealing') return 'R\u00e9sum\u00e9';
  if (phase === 'failed') return '\u00c9chec';
  return durationStr;
}

export function isGenericSessionTitle(title?: string | null): boolean {
  const value = title?.trim();
  if (!value) return true;

  const normalizedValue = normalizeForComparison(value);
  return GENERIC_TITLES.some((generic) =>
    normalizedValue.includes(normalizeForComparison(generic))
  );
}

export function cleanSummaryTitle(value?: string | null): string {
  if (!value) return '';

  const cleaned = value
    .split('\n')[0]
    .replace(/\*\*/g, '')
    .replace(
      /^(La discussion porte sur|La conversation porte sur|Ce \w+ porte sur|Le sujet est)\s*/i,
      ''
    )
    .trim();

  return isGenericSessionTitle(cleaned) ? '' : cleaned;
}

function truncateTitle(value: string): string {
  if (value.length <= MAX_DERIVED_TITLE_LENGTH) return value;
  return value.substring(0, MAX_DERIVED_TITLE_LENGTH).trimEnd() + '\u2026';
}

/**
 * Returns the display title to show in the UI.
 *
 * Priority:
 *  1. session.title if it is not a generic placeholder
 *  2. cleaned-up first line of summary.tldr
 *  3. phase-dependent fallback
 *
 * This never returns "Discussion avec Claire" as a final title.
 */
export function getSessionDisplayTitle(
  session?: Session | null,
  summary?: Summary | null,
  displayState: SessionDisplayState = {}
): string {
  const trimmed = session?.title?.trim();
  if (trimmed && !isGenericSessionTitle(trimmed)) {
    return trimmed;
  }

  const summaryTitle = cleanSummaryTitle(summary?.tldr);
  if (summaryTitle) {
    return truncateTitle(summaryTitle);
  }

  const phase = getSessionPhase(session, summary, displayState);
  if (phase === 'ongoing') return 'Session en cours';
  if (phase === 'ending') return 'Fin de session';
  return 'Sans titre';
}

export function getSessionSummaryUnavailableMessage(
  reason?: string | null
): string {
  if (!reason) {
    return 'Claire n\u2019a pas pu g\u00e9n\u00e9rer ce r\u00e9sum\u00e9. Vous pouvez r\u00e9essayer plus tard.';
  }

  const normalized = reason.toLowerCase();
  if (normalized.includes('429') || normalized.includes('rate') || normalized.includes('quota')) {
    return 'Quota IA atteint temporairement. Vous pouvez r\u00e9essayer plus tard.';
  }

  return 'Claire n\u2019a pas pu g\u00e9n\u00e9rer ce r\u00e9sum\u00e9. Vous pouvez r\u00e9essayer plus tard.';
}
