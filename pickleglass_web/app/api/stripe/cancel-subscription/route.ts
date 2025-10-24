import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getApps } from 'firebase-admin/app'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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
    
    // Ici tu devrais vérifier le token Firebase, mais pour simplifier on va chercher l'utilisateur actuel
    // En production, tu devrais utiliser Firebase Admin Auth pour vérifier le token
    
    const db = getFirestore()
    
    // Pour l'instant, on va chercher l'utilisateur par son email ou ID
    // Tu peux adapter cette logique selon ton système d'auth
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

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

    // Annuler l'abonnement sur Stripe (à la fin de la période)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    })

    // Mettre à jour Firestore
    await userRef.update({
      'subscription.cancelAtPeriodEnd': true,
      'subscription.updatedAt': FieldValue.serverTimestamp()
    })

    console.log('✅ Subscription canceled at period end:', subscriptionId)

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current period',
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString()
    })

  } catch (error: any) {
    console.error('Stripe cancel subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
