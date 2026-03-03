import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ensureAdminTables } from "@/lib/db";

/** One-time setup: ensures admin columns and tables exist */
export async function POST() {
  try {
    await requireAdmin();
    await ensureAdminTables();
    return NextResponse.json({ ok: true, message: "Admin tables ensured" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
