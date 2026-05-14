import { NextRequest, NextResponse } from 'next/server'
import { getFirestore } from 'firebase-admin/firestore'
import { getApps } from 'firebase-admin/app'

export async function GET(request: NextRequest) {
  try {
    // Vérifier si Firebase Admin est initialisé
    if (getApps().length === 0) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      )
    }

    const db = getFirestore()
    console.log('🔍 Recherche de tous les utilisateurs avec abonnements Stripe...')
    
    // Récupérer tous les utilisateurs qui ont un stripeSubscriptionId
    const usersSnapshot = await db.collection('users')
      .where('subscription.stripeSubscriptionId', '!=', null)
      .get()
    
    const subscriptions = []
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const subscription = userData.subscription
      
      if (subscription?.stripeSubscriptionId) {
        subscriptions.push({
          userId: userDoc.id,
          email: userData.email,
          displayName: userData.displayName,
          subscriptionId: subscription.stripeSubscriptionId,
          currentPlan: subscription.plan,
          currentStatus: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd?.toDate?.() || subscription.currentPeriodEnd
        })
      }
    }
    
    console.log(`📊 Trouvé ${subscriptions.length} utilisateurs avec abonnements Stripe`)
    
    return NextResponse.json({
      success: true,
      count: subscriptions.length,
      subscriptions: subscriptions
    })
    
  } catch (error: any) {
    console.error('Error listing subscriptions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list subscriptions' },
      { status: 500 }
    )
  }
}
