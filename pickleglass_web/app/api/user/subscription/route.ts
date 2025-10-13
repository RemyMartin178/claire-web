import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/firebaseAdmin'
import { StripeAdminService } from '@/utils/stripeAdmin'

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
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
    console.log('Getting subscription for user:', userId)

    // Get subscription from Firestore
    const subscription = await StripeAdminService.getUserSubscription(userId)
    const hasActiveSubscription = await StripeAdminService.hasActiveSubscription(userId)
    const plan = await StripeAdminService.getSubscriptionPlan(userId)

    const response = {
      plan: plan,
      status: subscription?.status || 'active',
      isActive: hasActiveSubscription,
      subscription: subscription
    }

    console.log('Subscription data:', response)
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error getting subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription' },
      { status: 500 }
    )
  }
}
