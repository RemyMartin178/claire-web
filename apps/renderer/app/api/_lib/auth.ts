import { NextRequest } from 'next/server'
import { ensureFirebaseAdminInitialized } from '@/utils/firebaseAdmin'

export async function verifyFirebaseToken(request: NextRequest): Promise<{ uid: string } | null> {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const token = authorization.slice(7)
  const auth = ensureFirebaseAdminInitialized()
  if (!auth) return null

  try {
    const decoded = await auth.verifyIdToken(token)
    return { uid: decoded.uid }
  } catch {
    return null
  }
}

// Simple in-memory rate limiter — resets on cold start, good enough for v1
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(uid: string, limitPerMinute: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(uid)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(uid, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= limitPerMinute) return false

  entry.count++
  return true
}
