import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { StripeAdminService } from '@/utils/stripeAdmin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const buildCustomerSnapshot = (c: Stripe.Customer) => ({
  id: c.id,
  email: c.email,
  name: c.name,
  livemode: c.livemode,
  created: c.created,
  currency: (c as any).currency,
  invoice_prefix: (c as any).invoice_prefix,
  invoice_settings: (c as any).invoice_settings,
  preferred_locales: c.preferred_locales,
  metadata: c.metadata,
})

const findUserDocByCustomerId = async (customerId: string) => {
  const db = getFirestore()
  const snap1 = await db.collection('users').where('subscription.stripeCustomerId', '==', customerId).get()
  if (!snap1.empty) return snap1.docs[0]

  // Backward compat: older docs stored stripeCustomerId as an object { id: 'cus_...' }
  const snap2 = await db.collection('users').where('subscription.stripeCustomerId.id', '==', customerId).get()
  if (!snap2.empty) return snap2.docs[0]

  return null
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe only when needed (not during build)
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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

        // Optionnel: snapshot customer pour debug/UX parity
        let customerSnapshot: Record<string, any> | undefined
        try {
          const c = await stripe.customers.retrieve(customerId)
          if (!(c as any).deleted) {
            customerSnapshot = buildCustomerSnapshot(c as Stripe.Customer)
          }
        } catch (e) {
          console.warn('Could not retrieve Stripe customer for snapshot:', e)
        }
        
        // Récupérer les vraies dates depuis l'abonnement Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const currentPeriodStart = new Date((subscription as any).current_period_start * 1000)
        const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000)
        
        console.log('Stripe subscription dates:', {
          currentPeriodStart: currentPeriodStart.toISOString(),
          currentPeriodEnd: currentPeriodEnd.toISOString(),
          status: subscription.status
        })
        
        // Update user subscription in Firestore avec les vraies dates
        await StripeAdminService.updateUserSubscription(userId, {
          status: 'active',
          plan: 'plus', // Claire Plus subscription
          stripeCustomerId: customerId,
          ...(customerSnapshot ? { stripeCustomer: customerSnapshot } : {}),
          stripeSubscriptionId: subscriptionId,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false
        })
        
        console.log('✅ Subscription updated in Firestore for user:', userId)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('📝 Subscription updated:', subscription.id)
        
        // Récupérer les vraies dates depuis l'abonnement Stripe
        const currentPeriodStart = new Date((subscription as any).current_period_start * 1000)
        const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000)
        
        console.log('Updated subscription dates:', {
          currentPeriodStart: currentPeriodStart.toISOString(),
          currentPeriodEnd: currentPeriodEnd.toISOString(),
          status: subscription.status
        })
        
        // Trouver l'utilisateur par customer ID
        const customerId = subscription.customer as string
        try {
          const userDoc = await findUserDocByCustomerId(customerId)
          if (userDoc) {
            const userId = userDoc.id
            
            console.log(`🔄 Mise à jour automatique de l'utilisateur ${userId}`)

            // Best-effort snapshot customer
            let customerSnapshot: Record<string, any> | undefined
            try {
              const c = await stripe.customers.retrieve(customerId)
              if (!(c as any).deleted) customerSnapshot = buildCustomerSnapshot(c as Stripe.Customer)
            } catch {}
            
            // Mettre à jour avec les vraies dates Stripe
            await userDoc.ref.update({
              'subscription.currentPeriodStart': currentPeriodStart,
              'subscription.currentPeriodEnd': currentPeriodEnd,
              'subscription.status': subscription.status,
              'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end || false,
              ...(customerSnapshot ? { 'subscription.stripeCustomer': customerSnapshot } : {}),
              'subscription.updatedAt': FieldValue.serverTimestamp()
            })
            
            console.log('✅ Utilisateur mis à jour automatiquement')
          } else {
            console.log('⚠️ Aucun utilisateur trouvé pour ce customer ID')
          }
        } catch (error) {
          console.error('❌ Erreur lors de la mise à jour:', error)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('❌ Subscription canceled:', subscription.id)
        
        // ✅ FIX: Mettre à jour Firestore quand l'abonnement est annulé
        const customerId = subscription.customer as string
        
        try {
          const userDoc = await findUserDocByCustomerId(customerId)
          if (userDoc) {
            const userId = userDoc.id
            
            console.log(`🔄 Annulation de l'abonnement pour l'utilisateur ${userId}`)
            
            // Mettre à jour le statut de l'abonnement à canceled
            await userDoc.ref.update({
              'subscription.status': 'canceled',
              'subscription.plan': 'free',
              'subscription.cancelAtPeriodEnd': false,
              'subscription.currentPeriodEnd': null,
              'subscription.updatedAt': FieldValue.serverTimestamp()
            })
            
            console.log('✅ Abonnement annulé dans Firestore pour l\'utilisateur:', userId)
          } else {
            console.log('⚠️ Aucun utilisateur trouvé pour ce customer ID:', customerId)
          }
        } catch (error) {
          console.error('❌ Erreur lors de l\'annulation:', error)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('💰 Payment succeeded for invoice:', invoice.id)
        
        // Handle successful recurring payments
        const subscriptionId = (invoice as any).subscription
        console.log('✅ Recurring payment successful for subscription:', subscriptionId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('❌ Payment failed for invoice:', invoice.id)
        
        // Handle failed payments
        const subscriptionId = (invoice as any).subscription
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

