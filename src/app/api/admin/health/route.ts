import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();

    // DB check
    let dbOk = false;
    try {
      await sql`SELECT 1`;
      dbOk = true;
    } catch { /* ignore */ }

    // Gemini API key check
    const geminiConfigured = !!process.env.GEMINI_API_KEY;

    // Stripe check
    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;

    // NextAuth check
    const authConfigured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.NEXTAUTH_SECRET;

    return NextResponse.json({
      database: dbOk ? "ok" : "error",
      gemini: geminiConfigured ? "configured" : "missing",
      stripe: stripeConfigured ? "configured" : "missing",
      auth: authConfigured ? "configured" : "missing",
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
