import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { StripeAdminService } from '../../../utils/stripeAdmin'

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe only when needed (not during build)
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    })

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`)
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('✅ Checkout completed:', session.id)
        
        const userId = session.metadata?.userId
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        
        if (!userId) {
          console.error('❌ No userId in session metadata')
          break
        }

        console.log('User subscribed:', { userId, customerId, subscriptionId })
        
        // Update user subscription in Firestore
        await StripeAdminService.updateUserSubscription(userId, {
          status: 'active',
          plan: 'plus', // Claire Plus subscription
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
          cancelAtPeriodEnd: false
        })
        
        console.log('✅ Subscription updated in Firestore for user:', userId)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('📝 Subscription updated:', subscription.id)
        
        // Find user by customer ID
        const customerId = subscription.customer as string
        // Note: In a real app, you'd need to store customer->userId mapping
        // For now, we'll handle this in the subscription.deleted event
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('❌ Subscription canceled:', subscription.id)
        
        // Find user by customer ID and cancel their subscription
        const customerId = subscription.customer as string
        
        // Note: In a real app, you'd need to store customer->userId mapping
        // For now, this will be handled when user accesses their account
        console.log('⚠️ Subscription canceled for customer:', customerId)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('💰 Payment succeeded for invoice:', invoice.id)
        
        // Handle successful recurring payments
        const subscriptionId = invoice.subscription as string
        console.log('✅ Recurring payment successful for subscription:', subscriptionId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('❌ Payment failed for invoice:', invoice.id)
        
        // Handle failed payments
        const subscriptionId = invoice.subscription as string
        console.log('⚠️ Payment failed for subscription:', subscriptionId)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

