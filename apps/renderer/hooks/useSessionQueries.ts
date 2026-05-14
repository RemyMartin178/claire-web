'use client'

import { useQuery, type QueryClient } from '@tanstack/react-query'
import {
  getCachedSessionDetails,
  getCachedSessions,
  getSessionDetails,
  getSessions,
  type Session,
  type SessionDetails,
} from '@/utils/api'

export const SESSION_QUERY_STALE_TIME = 5 * 60 * 1000

export const sessionKeys = {
  all: ['sessions'] as const,
  list: () => [...sessionKeys.all, 'list'] as const,
  detail: (sessionId: string) => [...sessionKeys.all, 'detail', sessionId] as const,
}

export function useSessionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: () => getSessions({ forceRefresh: true }),
    enabled,
    staleTime: SESSION_QUERY_STALE_TIME,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    placeholderData: () => getCachedSessions() ?? undefined,
  })
}

export function useSessionDetailsQuery(sessionId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: sessionId ? sessionKeys.detail(sessionId) : [...sessionKeys.all, 'detail', 'missing'],
    queryFn: () => getSessionDetails(sessionId!, { forceRefresh: true }),
    enabled: enabled && Boolean(sessionId),
    staleTime: SESSION_QUERY_STALE_TIME,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    placeholderData: () => (sessionId ? getCachedSessionDetails(sessionId) ?? undefined : undefined),
  })
}

export function prefetchSessionDetailsQuery(queryClient: QueryClient, sessionId: string) {
  return queryClient.prefetchQuery({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: () => getSessionDetails(sessionId, { forceRefresh: true }),
    staleTime: SESSION_QUERY_STALE_TIME,
  })
}

export function patchSessionList(queryClient: QueryClient, updater: (sessions: Session[]) => Session[]) {
  queryClient.setQueryData<Session[]>(sessionKeys.list(), (sessions) => {
    if (!sessions) return sessions
    return updater(sessions)
  })
}

export function patchSessionFromDetails(queryClient: QueryClient, details: SessionDetails) {
  patchSessionList(queryClient, (sessions) =>
    sessions.map((session) => (session.id === details.session.id ? { ...session, ...details.session } : session))
  )
}
