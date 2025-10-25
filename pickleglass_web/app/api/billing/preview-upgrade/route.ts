import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { customerId, subscriptionId, annualPriceId } = await req.json();

    if (!customerId || !subscriptionId || !annualPriceId) {
      return NextResponse.json({ error: "missing params" }, { status: 400 });
    }

    // fetch current sub to mirror quantities & tax settings
    const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
    const currentItem = sub.items.data[0];
    const quantity = currentItem.quantity ?? 1;

    const now = Math.floor(Date.now() / 1000);

    const upcoming = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
      subscription: subscriptionId,
      subscription_proration_date: now,
      subscription_items: [
        {
          id: currentItem.id,        // replace existing item
          price: annualPriceId,      // target annual price
          quantity,
        },
      ],
    });

    // compute proration credit and net amount due from lines
    let prorationCredit = 0;
    let newCharge = 0;

    for (const line of upcoming.lines.data) {
      if (line.proration) {
        if ((line.amount ?? 0) < 0) prorationCredit += Math.abs(line.amount ?? 0);
        else newCharge += line.amount ?? 0;
      }
    }

    const amountDue = upcoming.amount_due ?? 0;

    return NextResponse.json({
      currency: upcoming.currency,
      prorationCredit,
      newCharge,
      amountDue,
      summary: {
        subtotal: upcoming.subtotal ?? 0,
        total: upcoming.total ?? 0,
      },
      previewAt: now,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "preview_failed" }, { status: 500 });
  }
}
