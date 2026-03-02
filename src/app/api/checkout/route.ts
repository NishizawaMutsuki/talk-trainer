import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByGoogleId } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
  }

  const googleId = (session.user as Record<string, unknown>).googleId as string;
  const user = await getUserByGoogleId(googleId);

  // 既存のStripe顧客があればそれを使う
  let customerId = user?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
      metadata: { google_id: googleId },
    });
    customerId = customer.id;
  }

  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${baseUrl}/?upgraded=true`,
    cancel_url: `${baseUrl}/`,
    metadata: { google_id: googleId },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
