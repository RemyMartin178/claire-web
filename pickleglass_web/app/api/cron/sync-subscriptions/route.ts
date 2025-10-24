import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getApps } from 'firebase-admin/app'
import Stripe from 'stripe'

export async function GET(request: NextRequest) {
  try {
    // Vérifier si c'est un appel cron (Vercel Cron)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Vérifier si Stripe est configuré
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    // Vérifier si Firebase Admin est initialisé
    if (getApps().length === 0) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      )
    }

    const db = getFirestore()
    console.log('🔄 Synchronisation quotidienne des abonnements...')
    
    // Récupérer tous les utilisateurs avec abonnements Stripe
    const usersSnapshot = await db.collection('users')
      .where('subscription.stripeSubscriptionId', '!=', null)
      .get()
    
    let syncedCount = 0
    let errorCount = 0
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data()
        const subscription = userData.subscription
        const stripeSubscriptionId = subscription.stripeSubscriptionId
        
        console.log(`🔄 Synchronisation de l'utilisateur ${userDoc.id}...`)
        
        // Récupérer les données actuelles depuis Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        
        // Vérifier si une mise à jour est nécessaire
        const currentPeriodStart = new Date((stripeSubscription as any).current_period_start * 1000)
        const currentPeriodEnd = new Date((stripeSubscription as any).current_period_end * 1000)
        
        // Mettre à jour Firestore avec les vraies données Stripe
        await userDoc.ref.update({
          'subscription.currentPeriodStart': currentPeriodStart,
          'subscription.currentPeriodEnd': currentPeriodEnd,
          'subscription.status': stripeSubscription.status,
          'subscription.cancelAtPeriodEnd': (stripeSubscription as any).cancel_at_period_end || false,
          'subscription.updatedAt': FieldValue.serverTimestamp()
        })
        
        syncedCount++
        console.log(`✅ Utilisateur ${userDoc.id} synchronisé`)
        
        // Pause pour éviter de surcharger Stripe
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error: any) {
        console.error(`❌ Erreur pour l'utilisateur ${userDoc.id}:`, error.message)
        errorCount++
      }
    }
    
    console.log(`🎉 Synchronisation quotidienne terminée: ${syncedCount} succès, ${errorCount} erreurs`)
    
    return NextResponse.json({
      success: true,
      message: 'Synchronisation quotidienne terminée',
      syncedCount,
      errorCount,
      totalUsers: usersSnapshot.size
    })
    
  } catch (error: any) {
    console.error('Error in daily sync:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync subscriptions' },
      { status: 500 }
    )
  }
}
