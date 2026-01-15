import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { auth } from '@/utils/firebaseAdmin'
import { StripeAdminService } from '@/utils/stripeAdmin'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    if (!auth) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 })
    }

    const authorization = request.headers.get('authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authorization.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { sessionId } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    // Basic ownership checks to avoid syncing someone else's session
    const sessionUserId = session.metadata?.userId
    const sessionEmail = session.customer_details?.email || session.customer_email || undefined
    const tokenEmail = decodedToken.email || undefined

    const ownedByUserId = !!sessionUserId && sessionUserId === userId
    const ownedByEmail = !!sessionEmail && !!tokenEmail && sessionEmail.toLowerCase() === tokenEmail.toLowerCase()

    if (!ownedByUserId && !ownedByEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as any)?.id

    if (!customerId || !subscriptionId) {
      return NextResponse.json(
        { error: 'Checkout session not ready (missing customer/subscription)' },
        { status: 409 }
      )
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const currentPeriodStart = new Date((subscription as any).current_period_start * 1000)
    const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000)

    await StripeAdminService.updateUserSubscription(userId, {
      status: (subscription.status as any) || 'active',
      plan: 'plus',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
    })

    return NextResponse.json({
      success: true,
      userId,
      subscriptionId,
      customerId,
      status: subscription.status,
    })
  } catch (error: any) {
    console.error('sync-checkout-session error:', error)
    return NextResponse.json({ error: error.message || 'Failed to sync checkout session' }, { status: 500 })
  }
}

