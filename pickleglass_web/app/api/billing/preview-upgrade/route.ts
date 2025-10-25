import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { customerId, subscriptionId, annualPriceId } = await req.json();

    if (!customerId || !subscriptionId || !annualPriceId) {
      return NextResponse.json({ error: "missing params" }, { status: 400 });
    }

    // Fetch current subscription to get details
    const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
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
    const dailyCurrentPrice = (currentPrice.unit_amount ?? 0) / (periodDuration / 86400);
    const dailyAnnualPrice = (annualPrice.unit_amount ?? 0) / 365;
    
    const creditRemainingDays = timeRemaining / 86400;
    const prorationCredit = Math.round(dailyCurrentPrice * creditRemainingDays);
    
    const annualCharge = Math.round(dailyAnnualPrice * 365);
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
