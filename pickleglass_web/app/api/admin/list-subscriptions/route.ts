import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { ensureFirebaseAdminInitialized } from '@/utils/firebaseAdmin'

function toIsoString(value: any): string | null {
  if (!value) return null
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export async function GET(request: NextRequest) {
  try {
    ensureFirebaseAdminInitialized()

    const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(authorization.slice(7))
    } catch {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
    }

    const db = getFirestore()
    const adminDocument = await db.collection('users').doc(decodedToken.uid).get()
    if (!adminDocument.exists || adminDocument.data()?.isAdmin !== true) {
      return NextResponse.json({ error: 'Acces administrateur requis' }, { status: 403 })
    }

    const usersSnapshot = await db.collection('users').get()
    const accounts = usersSnapshot.docs.map((userDocument) => {
      const user = userDocument.data()
      const subscription = user.subscription || {}
      const status = subscription.status || 'inactive'
      const plan = subscription.plan || 'free'
      const hasActiveSubscription =
        ['active', 'trialing'].includes(status) && plan !== 'free'

      return {
        id: userDocument.id,
        email: user.email || '',
        displayName: user.displayName || user.display_name || '',
        createdAt: toIsoString(user.createdAt),
        isAdmin: user.isAdmin === true,
        isMock: user.isMock === true,
        subscription: {
          plan,
          status,
          isActive: hasActiveSubscription,
          isLifetime: subscription.lifetime === true,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd === true,
          currentPeriodEnd: toIsoString(subscription.currentPeriodEnd),
        },
      }
    })

    accounts.sort((a, b) => {
      if (a.subscription.isActive !== b.subscription.isActive) {
        return a.subscription.isActive ? -1 : 1
      }
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return right - left
    })

    return NextResponse.json({
      accounts,
      stats: {
        total: accounts.length,
        activeSubscriptions: accounts.filter((account) => account.subscription.isActive).length,
        freeAccounts: accounts.filter((account) => account.subscription.plan === 'free').length,
        canceledSubscriptions: accounts.filter((account) =>
          ['canceled', 'unpaid', 'incomplete_expired'].includes(account.subscription.status)
        ).length,
      },
    })
  } catch (error) {
    console.error('Failed to list admin accounts:', error)
    return NextResponse.json(
      { error: 'Impossible de charger les comptes' },
      { status: 500 }
    )
  }
}
