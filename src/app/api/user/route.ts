import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByGoogleId } from "@/lib/db";

const FREE_LIMIT = 10;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ loggedIn: false });
  }

  const googleId = (session.user as Record<string, unknown>).googleId as string;
  const user = await getUserByGoogleId(googleId);

  if (!user) {
    return NextResponse.json({ loggedIn: true, plan: "free", usage: 0, limit: FREE_LIMIT, canUse: true });
  }

  const canUse = user.plan === "pro" || user.usage_count < FREE_LIMIT;

  return NextResponse.json({
    loggedIn: true,
    plan: user.plan,
    usage: user.usage_count,
    limit: FREE_LIMIT,
    canUse,
    model: user.plan === "pro" ? "think" : "standard",
  });
}
