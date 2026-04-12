import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";
import { getAuth } from 'firebase-admin/auth'
import { ensureFirebaseAdminInitialized } from '@/utils/firebaseAdmin'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    ensureFirebaseAdminInitialized()
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
      await getAuth().verifyIdToken(authHeader.split(' ')[1])
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { customerId, subscriptionId, annualPriceId: annualPriceIdFromClient } = await req.json();
    const annualPriceId = annualPriceIdFromClient || process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID;
    if (!customerId || !subscriptionId) {
      return NextResponse.json({ error: "missing params" }, { status: 400 });
    }

    if (!annualPriceId) {
      return NextResponse.json({ error: "annual price not configured" }, { status: 500 });
    }

    const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });

    // Ownership guard: avoid upgrading a subscription that isn't attached to the customer
    const subCustomerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id;
    if (subCustomerId && subCustomerId !== customerId) {
      return NextResponse.json({ error: "customer mismatch" }, { status: 403 });
    }

    const item = sub.items.data[0];
    const quantity = item.quantity ?? 1;

    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: item.id, price: annualPriceId, quantity }],
      proration_behavior: "create_prorations",
      payment_behavior: "default_incomplete", // safe: creates an invoice if extra is due
      expand: ["latest_invoice.payment_intent"],
    });

    const invoiceId = (updated.latest_invoice as any)?.id;
    const paymentIntent = (updated.latest_invoice as any)?.payment_intent;

    return NextResponse.json({
      status: updated.status,
      invoiceId,
      paymentIntentClientSecret: paymentIntent?.client_secret ?? null,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "upgrade_failed" }, { status: 500 });
  }
}
