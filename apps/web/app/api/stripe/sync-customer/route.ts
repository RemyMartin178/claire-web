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
    const tokenEmail = decodedToken.email || undefined

    const { customerId } = await request.json()
    if (!customerId || typeof customerId !== 'string' || !customerId.startsWith('cus_')) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const customer = await stripe.customers.retrieve(customerId)
    if ((customer as any).deleted) {
      return NextResponse.json({ error: 'Stripe customer deleted' }, { status: 404 })
    }
    const customerObj = customer as Stripe.Customer
    const customerEmail = (customerObj.email || undefined)?.toLowerCase()

    // Ownership check: only allow syncing if Stripe customer email matches Firebase token email
    if (!tokenEmail || !customerEmail || customerEmail !== tokenEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    })

    const candidate = subs.data
      .slice()
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .find(s => ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(s.status))

    if (!candidate) {
      return NextResponse.json({ error: 'No subscription found for customer' }, { status: 404 })
    }

    const currentPeriodStart = new Date((candidate as any).current_period_start * 1000)
    const currentPeriodEnd = new Date((candidate as any).current_period_end * 1000)

    // For now: any paid subscription => Plus (the product split can be added later if needed)
    const plan: 'plus' = 'plus'

    await StripeAdminService.updateUserSubscription(userId, {
      status: (candidate.status as any) || 'active',
      plan,
      stripeCustomerId: customerId,
      stripeCustomer: {
        id: customerObj.id,
        email: customerObj.email,
        name: customerObj.name,
        livemode: customerObj.livemode,
        created: customerObj.created,
        currency: (customerObj as any).currency,
        invoice_prefix: (customerObj as any).invoice_prefix,
        invoice_settings: (customerObj as any).invoice_settings,
        preferred_locales: customerObj.preferred_locales,
        metadata: customerObj.metadata,
      },
      stripeSubscriptionId: candidate.id,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: candidate.cancel_at_period_end || false,
    })

    return NextResponse.json({
      success: true,
      userId,
      customerId,
      subscriptionId: candidate.id,
      status: candidate.status,
    })
  } catch (error: any) {
    console.error('sync-customer error:', error)
    return NextResponse.json({ error: error.message || 'Failed to sync customer' }, { status: 500 })
  }
}

