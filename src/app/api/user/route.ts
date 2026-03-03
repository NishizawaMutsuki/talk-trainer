import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByGoogleId } from "@/lib/db";
import { FREE_MODELS, PRO_MODELS } from "@/lib/ai-router";

const FREE_LIMIT = 10;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ loggedIn: false });
  }

  const googleId = (session.user as Record<string, unknown>).googleId as string;
  const role = (session.user as Record<string, unknown>).role as string | undefined;
  const user = await getUserByGoogleId(googleId);

  if (!user) {
    return NextResponse.json({
      loggedIn: true,
      plan: "free",
      usage: 0,
      limit: FREE_LIMIT,
      canUse: true,
      availableModels: FREE_MODELS,
      unlimited: false,
      role: role || "user",
    });
  }

  const isAdmin = role === "admin";
  const isPro = user.plan === "pro";
  // Admin gets unlimited usage regardless of plan
  const canUse = isAdmin || isPro || user.usage_count < FREE_LIMIT;
  const unlimited = isAdmin;

  return NextResponse.json({
    loggedIn: true,
    plan: user.plan,
    usage: user.usage_count,
    limit: FREE_LIMIT,
    canUse,
    availableModels: (isPro || isAdmin) ? PRO_MODELS : FREE_MODELS,
    unlimited,
    role: role || "user",
  });
}
