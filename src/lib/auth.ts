import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { findOrCreateUser } from "@/lib/db";

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
        await findOrCreateUser({
          google_id: account.providerAccountId,
          email: user.email ?? "",
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        });
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account?.providerAccountId) {
        token.googleId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.googleId) {
        (session.user as Record<string, unknown>).googleId = token.googleId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
