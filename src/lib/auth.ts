import { type NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { findOrCreateUser, getUserByGoogleId, type DbUser } from "@/lib/db";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && account.providerAccountId) {
        const dbUser = await findOrCreateUser({
          google_id: account.providerAccountId,
          email: user.email ?? "",
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        });
        // Auto-promote admin emails on sign-in
        if (
          ADMIN_EMAILS.includes((user.email ?? "").toLowerCase()) &&
          dbUser.role !== "admin"
        ) {
          const { sql } = await import("@/lib/db");
          await sql`UPDATE users SET role = 'admin' WHERE id = ${dbUser.id}`;
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account?.providerAccountId) {
        token.googleId = account.providerAccountId;
      }
      // Refresh role from DB on every token refresh
      if (token.googleId) {
        const user = await getUserByGoogleId(token.googleId as string);
        token.role = user?.role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.googleId) {
        (session.user as Record<string, unknown>).googleId = token.googleId;
        (session.user as Record<string, unknown>).role = token.role ?? "user";
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};

/** Require admin role – returns the DbUser or throws */
export async function requireAdmin(): Promise<DbUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const googleId = (session.user as Record<string, unknown>).googleId as string;
  if (!googleId) throw new Error("Unauthorized");

  const user = await getUserByGoogleId(googleId);
  if (!user || user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}
