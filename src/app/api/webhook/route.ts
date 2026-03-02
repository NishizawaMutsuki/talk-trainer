import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateSubscription, cancelSubscription } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  // Webhook署名検証（STRIPE_WEBHOOK_SECRETが設定されている場合）
  let event: Stripe.Event;
  if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return NextResponse.json({ error: "署名検証失敗" }, { status: 400 });
    }
  } else {
    event = JSON.parse(body) as Stripe.Event;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const googleId = session.metadata?.google_id;
      if (googleId && session.customer && session.subscription) {
        await updateSubscription(
          googleId,
          session.customer as string,
          session.subscription as string
        );
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await cancelSubscription(sub.customer as string);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
