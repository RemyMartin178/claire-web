import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getApps } from 'firebase-admin/app'

export async function POST(request: NextRequest) {
  try {
    // Vérifier si Stripe est configuré
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    })

    // Récupérer les paramètres
    const { userId, subscriptionId } = await request.json()

    if (!userId || !subscriptionId) {
      return NextResponse.json(
        { error: 'userId and subscriptionId are required' },
        { status: 400 }
      )
    }

    console.log(`Fixing subscription ${subscriptionId} for user ${userId}...`)

    // Récupérer les données depuis Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)

    console.log('Stripe data:', {
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      status: stripeSubscription.status,
    })

    // Mettre à jour Firestore
    if (getApps().length === 0) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      )
    }

    const db = getFirestore()
    const userRef = db.collection('users').doc(userId)

    await userRef.update({
      'subscription.currentPeriodStart': new Date(stripeSubscription.current_period_start * 1000),
      'subscription.currentPeriodEnd': new Date(stripeSubscription.current_period_end * 1000),
      'subscription.status': stripeSubscription.status,
      'subscription.cancelAtPeriodEnd': stripeSubscription.cancel_at_period_end,
      'subscription.updatedAt': FieldValue.serverTimestamp(),
    })

    const fixedDate = new Date(stripeSubscription.current_period_end * 1000)

    return NextResponse.json({
      success: true,
      message: 'Subscription dates updated successfully',
      renewalDate: fixedDate.toISOString(),
      renewalDateFormatted: fixedDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    })

  } catch (error: any) {
    console.error('Error fixing subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fix subscription' },
      { status: 500 }
    )
  }
}

