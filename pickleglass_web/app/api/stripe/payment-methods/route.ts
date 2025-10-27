import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const { customerId } = await request.json()

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    // Récupérer les méthodes de paiement du client
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    // Récupérer la méthode de paiement par défaut
    const customer = await stripe.customers.retrieve(customerId)
    const defaultPaymentMethodId = (customer as any).invoice_settings?.default_payment_method

    let defaultPaymentMethod = null
    if (defaultPaymentMethodId) {
      defaultPaymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethodId as string)
    } else if (paymentMethods.data.length > 0) {
      defaultPaymentMethod = paymentMethods.data[0]
    }

    return NextResponse.json({
      paymentMethod: defaultPaymentMethod,
      allPaymentMethods: paymentMethods.data
    })
  } catch (error: any) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}
