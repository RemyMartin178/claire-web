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

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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

    // Compat champs Stripe: snake_case vs camelCase selon SDK/versions
    const currentPeriodStartSec: number | undefined = (stripeSubscription as any).current_period_start ?? (stripeSubscription as any).currentPeriodStart
    const currentPeriodEndSec: number | undefined = (stripeSubscription as any).current_period_end ?? (stripeSubscription as any).currentPeriodEnd
    const status: string | undefined = (stripeSubscription as any).status
    const cancelAtPeriodEnd: boolean | undefined = (stripeSubscription as any).cancel_at_period_end ?? (stripeSubscription as any).cancelAtPeriodEnd

    console.log('Stripe data:', {
      current_period_start: currentPeriodStartSec ? new Date(currentPeriodStartSec * 1000).toISOString() : undefined,
      current_period_end: currentPeriodEndSec ? new Date(currentPeriodEndSec * 1000).toISOString() : undefined,
      status,
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
      'subscription.currentPeriodStart': currentPeriodStartSec ? new Date(currentPeriodStartSec * 1000) : undefined,
      'subscription.currentPeriodEnd': currentPeriodEndSec ? new Date(currentPeriodEndSec * 1000) : undefined,
      'subscription.status': status,
      'subscription.cancelAtPeriodEnd': cancelAtPeriodEnd,
      'subscription.updatedAt': FieldValue.serverTimestamp(),
    })

    const fixedDate = currentPeriodEndSec ? new Date(currentPeriodEndSec * 1000) : new Date()

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

