import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe only when needed (not during build)
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const { customerId, returnUrl } = await request.json()

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    console.log('Creating portal session for customer:', customerId, 'Type:', typeof customerId)

    // Forcer la conversion en string si nécessaire
    let finalCustomerId = customerId
    if (customerId) {
      // Si c'est un objet, extraire l'ID
      if (typeof customerId === 'object' && customerId.id) {
        finalCustomerId = customerId.id
        console.log('Extracted ID from object:', finalCustomerId)
      } else if (typeof customerId === 'object') {
        // Si c'est un objet mais pas de propriété id, essayer d'autres propriétés
        console.log('Object without id property, trying to extract:', customerId)
        if (customerId.customerId) {
          finalCustomerId = customerId.customerId
        } else if (customerId.customer_id) {
          finalCustomerId = customerId.customer_id
        } else {
          console.error('Cannot extract customer ID from object:', customerId)
          return NextResponse.json(
            { error: 'Invalid customer object format' },
            { status: 400 }
          )
        }
      } else {
        finalCustomerId = String(customerId)
        console.log('Converted customerId to string:', finalCustomerId)
      }
    }

    // Vérifier que le customer ID est valide
    if (typeof finalCustomerId !== 'string' || !finalCustomerId) {
      console.error('Customer ID is not a valid string:', finalCustomerId)
      return NextResponse.json(
        { error: 'Customer ID must be a valid string' },
        { status: 400 }
      )
    }

    if (!finalCustomerId.startsWith('cus_')) {
      console.error('Customer ID does not start with cus_:', finalCustomerId)
      return NextResponse.json(
        { error: 'Invalid customer ID format - must start with cus_' },
        { status: 400 }
      )
    }

    // Create Stripe Customer Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: finalCustomerId,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    })

    console.log('Portal session created:', session.id)
    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe portal error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}

