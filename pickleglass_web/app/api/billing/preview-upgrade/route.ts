import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
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

    // Fetch current subscription to get details
    const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });

    // Ownership guard: avoid upgrading a subscription that isn't attached to the customer
    const subCustomerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id;
    if (subCustomerId && subCustomerId !== customerId) {
      return NextResponse.json({ error: "customer mismatch" }, { status: 403 });
    }

    const currentItem = sub.items.data[0];
    const quantity = currentItem.quantity ?? 1;

    // Get the current price and annual price
    const currentPriceId = currentItem.price.id;
    const annualPrice = await stripe.prices.retrieve(annualPriceId);
    const currentPrice = await stripe.prices.retrieve(currentPriceId);

    // Calculate proration manually
    const now = Math.floor(Date.now() / 1000);
    const periodStart = (sub as any).current_period_start;
    const periodEnd = (sub as any).current_period_end;
    const periodDuration = periodEnd - periodStart;
    const timeElapsed = now - periodStart;
    const timeRemaining = periodEnd - now;

    // Calculate proration credits and charges
    const annualCharge = annualPrice.unit_amount ?? 0;
    const monthlyCharge = currentPrice.unit_amount ?? 0;
    
    // Calculate daily rate for current monthly subscription
    const dailyCurrentPrice = monthlyCharge / (periodDuration / 86400);
    
    // Calculate credit for remaining days
    const creditRemainingDays = timeRemaining / 86400;
    const prorationCredit = Math.round(dailyCurrentPrice * creditRemainingDays);
    
    const amountDue = annualCharge - prorationCredit;

    return NextResponse.json({
      currency: currentPrice.currency,
      prorationCredit,
      newCharge: annualCharge,
      amountDue: Math.max(0, amountDue),
      summary: {
        subtotal: annualCharge,
        total: Math.max(0, amountDue),
      },
      previewAt: now,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "preview_failed" }, { status: 500 });
  }
}
