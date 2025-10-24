import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST(req: Request) {
  try {
    const { customerId, subscriptionId, annualPriceId } = await req.json();
    if (!customerId || !subscriptionId || !annualPriceId) {
      return NextResponse.json({ error: "missing params" }, { status: 400 });
    }

    const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
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
