import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { ensureFirebaseAdminInitialized } from '@/utils/firebaseAdmin'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    // Verify Firebase token
    ensureFirebaseAdminInitialized()
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = await getAuth().verifyIdToken(authHeader.split(' ')[1])
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verify the customerId belongs to the authenticated user
    const db = getFirestore()
    const userDoc = await db.collection('users').doc(decoded.uid).get()
    const storedCustomerId = userDoc.data()?.subscription?.stripeCustomerId
    const resolvedStoredId = typeof storedCustomerId === 'object' ? storedCustomerId?.id : storedCustomerId

    const { customerId } = await request.json()

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    if (resolvedStoredId !== customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    const customer = await stripe.customers.retrieve(customerId)
    const defaultPaymentMethodId = (customer as any).invoice_settings?.default_payment_method

    let defaultPaymentMethod = null
    if (defaultPaymentMethodId) {
      defaultPaymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethodId as string)
    } else if (paymentMethods.data.length > 0) {
      defaultPaymentMethod = paymentMethods.data[0]
    }

    return NextResponse.json({
      paymentMethod: defaultPaymentMethod,
      allPaymentMethods: paymentMethods.data
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}
