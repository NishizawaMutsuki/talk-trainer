import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getUserById, adminUpdateUser, logAdminAction } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const user = await getUserById(Number(id));
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const userId = Number(id);
    const body = await req.json();

    const before = await getUserById(userId);
    if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const VALID_PLANS = ["free", "pro"];
    const VALID_ROLES = ["user", "admin"];

    const updates: { plan?: string; usage_count?: number; role?: string } = {};
    if (body.plan !== undefined) {
      if (!VALID_PLANS.includes(body.plan)) {
        return NextResponse.json({ error: "Invalid plan value" }, { status: 400 });
      }
      updates.plan = body.plan;
    }
    if (body.usage_count !== undefined) {
      const count = Number(body.usage_count);
      if (!Number.isInteger(count) || count < 0 || count > 100000) {
        return NextResponse.json({ error: "Invalid usage_count value" }, { status: 400 });
      }
      updates.usage_count = count;
    }
    if (body.role !== undefined) {
      if (!VALID_ROLES.includes(body.role)) {
        return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
      }
      updates.role = body.role;
    }

    const after = await adminUpdateUser(userId, updates);

    await logAdminAction(admin.google_id, "user_update", userId, {
      before: { plan: before.plan, usage_count: before.usage_count, role: before.role },
      after: updates,
    });

    return NextResponse.json({ user: after });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
