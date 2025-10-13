import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/firebaseAdmin'
import { StripeAdminService } from '@/utils/stripeAdmin'

export async function GET(request: NextRequest) {
  try {
    // Check if Firebase Admin is available
    if (!auth) {
      return NextResponse.json(
        { error: 'Firebase Admin not configured' },
        { status: 500 }
      )
    }

    // Get authorization header (Firebase token from desktop app)
    const authorization = request.headers.get('authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    // Verify Firebase token
    const token = authorization.split('Bearer ')[1]
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      console.error('Token verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid
    console.log('Desktop app requesting subscription status for user:', userId)

    // Get subscription from Firestore
    try {
      const subscription = await StripeAdminService.getUserSubscription(userId)
      const hasActiveSubscription = await StripeAdminService.hasActiveSubscription(userId)
      const plan = await StripeAdminService.getSubscriptionPlan(userId)

      // Return data in format expected by desktop app
      const response = {
        success: true,
        subscription: {
          plan: plan,
          status: subscription?.status || 'active',
          isActive: hasActiveSubscription,
          isPremium: plan === 'plus' || plan === 'enterprise',
          stripeCustomerId: subscription?.stripeCustomerId,
          stripeSubscriptionId: subscription?.stripeSubscriptionId,
          currentPeriodStart: subscription?.currentPeriodStart,
          currentPeriodEnd: subscription?.currentPeriodEnd,
          cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false
        },
        user: {
          uid: userId,
          email: decodedToken.email,
          displayName: decodedToken.name
        }
      }

      console.log('Desktop app subscription data:', response)
      return NextResponse.json(response)
    } catch (error: any) {
      // If Firebase Admin not initialized, return free plan
      if (error.message === 'Firebase Admin not initialized') {
        return NextResponse.json({
          success: true,
          subscription: {
            plan: 'free',
            status: 'active',
            isActive: false,
            isPremium: false
          },
          user: {
            uid: userId,
            email: decodedToken.email,
            displayName: decodedToken.name
          }
        })
      }
      throw error
    }
  } catch (error: any) {
    console.error('Error getting subscription for desktop app:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to get subscription',
        subscription: {
          plan: 'free',
          status: 'active',
          isActive: false,
          isPremium: false
        }
      },
      { status: 500 }
    )
  }
}
