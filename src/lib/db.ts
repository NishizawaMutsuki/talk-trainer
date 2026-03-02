import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export { sql };

// ─── User queries ──────────────────────────────────────────────

export interface DbUser {
  id: number;
  google_id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  usage_count: number;
  usage_reset_at: string;
}

export async function findOrCreateUser(profile: {
  google_id: string;
  email: string;
  name?: string;
  image?: string;
}): Promise<DbUser> {
  const rows = await sql`
    INSERT INTO users (google_id, email, name, image)
    VALUES (${profile.google_id}, ${profile.email}, ${profile.name ?? null}, ${profile.image ?? null})
    ON CONFLICT (google_id) DO UPDATE SET
      email = EXCLUDED.email, name = EXCLUDED.name,
      image = EXCLUDED.image, updated_at = NOW()
    RETURNING *
  `;
  return rows[0] as DbUser;
}

export async function getUserByGoogleId(googleId: string): Promise<DbUser | null> {
  const rows = await sql`SELECT * FROM users WHERE google_id = ${googleId}`;
  return (rows[0] as DbUser) ?? null;
}

export async function incrementUsage(googleId: string): Promise<{ usage_count: number; plan: string }> {
  const rows = await sql`
    UPDATE users SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE google_id = ${googleId}
    RETURNING usage_count, plan
  `;
  return rows[0] as { usage_count: number; plan: string };
}

export async function updateSubscription(
  googleId: string, stripeCustomerId: string, stripeSubscriptionId: string
): Promise<void> {
  await sql`
    UPDATE users SET plan = 'pro',
      stripe_customer_id = ${stripeCustomerId},
      stripe_subscription_id = ${stripeSubscriptionId}, updated_at = NOW()
    WHERE google_id = ${googleId}
  `;
}

export async function cancelSubscription(stripeCustomerId: string): Promise<void> {
  await sql`
    UPDATE users SET plan = 'free', stripe_subscription_id = NULL, updated_at = NOW()
    WHERE stripe_customer_id = ${stripeCustomerId}
  `;
}

export async function getUserByStripeCustomer(customerId: string): Promise<DbUser | null> {
  const rows = await sql`SELECT * FROM users WHERE stripe_customer_id = ${customerId}`;
  return (rows[0] as DbUser) ?? null;
}
