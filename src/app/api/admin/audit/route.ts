import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminActions } from "@/lib/db";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);
    const offset = Number(searchParams.get("offset") ?? 0);
    const actions = await getAdminActions(limit, offset);
    return NextResponse.json({ actions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
