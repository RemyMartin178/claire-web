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

    // Fetch current subscription to verify ownership
    const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });

    // Ownership guard
    const subCustomerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id;
    if (subCustomerId && subCustomerId !== customerId) {
      return NextResponse.json({ error: "customer mismatch" }, { status: 403 });
    }

    const currentItem = sub.items.data[0];
    const quantity = currentItem.quantity ?? 1;

    // Use Stripe's invoice preview for accurate proration calculation
    const upcomingInvoice = await stripe.invoices.createPreview({
      customer: customerId,
      subscription: subscriptionId,
      subscription_details: {
        items: [{ id: currentItem.id, price: annualPriceId, quantity }],
        proration_behavior: 'create_prorations',
      },
    });

    // Sum credits (negative lines) and new charge (positive lines)
    const prorationCredit = upcomingInvoice.lines.data
      .filter((line: any) => line.amount < 0)
      .reduce((sum: number, line: any) => sum + Math.abs(line.amount), 0);

    const newCharge = upcomingInvoice.lines.data
      .filter((line: any) => line.amount > 0)
      .reduce((sum: number, line: any) => sum + line.amount, 0);

    const amountDue = Math.max(0, upcomingInvoice.amount_due);

    return NextResponse.json({
      currency: upcomingInvoice.currency,
      prorationCredit,
      newCharge,
      amountDue,
      summary: {
        subtotal: upcomingInvoice.subtotal,
        total: amountDue,
      },
      previewAt: Math.floor(Date.now() / 1000),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "preview_failed" }, { status: 500 });
  }
}
