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

    const { customerId, returnUrl } = await request.json()

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    // Resolve customerId (handle legacy object format)
    let finalCustomerId: string
    if (typeof customerId === 'object' && customerId?.id) {
      finalCustomerId = customerId.id
    } else {
      finalCustomerId = String(customerId)
    }

    if (!finalCustomerId.startsWith('cus_')) {
      return NextResponse.json({ error: 'Invalid customer ID format' }, { status: 400 })
    }

    // Verify the customerId belongs to the authenticated user
    const db = getFirestore()
    const userDoc = await db.collection('users').doc(decoded.uid).get()
    const storedCustomerId = userDoc.data()?.subscription?.stripeCustomerId
    const resolvedStoredId = typeof storedCustomerId === 'object' ? storedCustomerId?.id : storedCustomerId

    if (resolvedStoredId !== finalCustomerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.billingPortal.sessions.create({
      customer: finalCustomerId,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
