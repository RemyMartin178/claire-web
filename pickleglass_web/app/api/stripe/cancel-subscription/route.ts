import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getApps } from 'firebase-admin/app'
import Stripe from 'stripe'
import { ensureFirebaseAdminInitialized } from '@/utils/firebaseAdmin'
import { getAuth } from 'firebase-admin/auth'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    // Ensure Firebase Admin is initialized
    ensureFirebaseAdminInitialized()

    if (getApps().length === 0) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      )
    }

    // Récupérer l'utilisateur depuis les headers d'authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]

    // Verify Firebase token (required)
    let decoded: any
    try {
      const adminAuth = getAuth()
      decoded = await adminAuth.verifyIdToken(token)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const db = getFirestore()

    // Use token uid as source of truth (ignore userId from client)
    const userId = decoded.uid

    // Récupérer l'abonnement de l'utilisateur
    const userRef = db.collection('users').doc(userId)
    const userDoc = await userRef.get()
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const subscriptionId = userData?.subscription?.stripeSubscriptionId

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    // Vérifier si l'abonnement est déjà annulé
    if (userData?.subscription?.cancelAtPeriodEnd === true) {
      return NextResponse.json(
        { error: 'L\'abonnement a déjà été annulé' },
        { status: 400 }
      )
    }

    // Récupérer l'abonnement Stripe pour vérifier son état
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    // Vérifier si l'abonnement Stripe est déjà annulé
    if (stripeSubscription.cancel_at_period_end === true) {
      return NextResponse.json(
        { error: 'L\'abonnement a déjà été annulé' },
        { status: 400 }
      )
    }

    // Annuler l'abonnement sur Stripe (à la fin de la période)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    })

    // Récupérer les dates de période depuis Stripe pour éviter toute confusion
    const currentPeriodStart = new Date((subscription as any).current_period_start * 1000)
    const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000)

    // Mettre à jour Firestore avec les dates correctes depuis Stripe
    await userRef.update({
      'subscription.cancelAtPeriodEnd': true,
      'subscription.currentPeriodStart': currentPeriodStart,
      'subscription.currentPeriodEnd': currentPeriodEnd,
      'subscription.updatedAt': FieldValue.serverTimestamp()
    })

    console.log('✅ Subscription canceled at period end:', subscriptionId)

    const end = new Date((subscription as any).current_period_end * 1000)

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current period',
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      currentPeriodEnd: Number.isNaN(end.getTime()) ? null : end.toISOString()
    })

  } catch (error: any) {
    console.error('Stripe cancel subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
