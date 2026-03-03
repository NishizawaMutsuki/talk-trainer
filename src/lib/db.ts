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
  role: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  usage_count: number;
  usage_reset_at: string;
  created_at: string;
}

export interface AdminAction {
  id: number;
  admin_google_id: string;
  action_type: string;
  target_user_id: number | null;
  changes: Record<string, unknown>;
  created_at: string;
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

// ─── Admin queries ────────────────────────────────────────────

export async function ensureAdminTables(): Promise<void> {
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_actions (
      id SERIAL PRIMARY KEY,
      admin_google_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_user_id INTEGER,
      changes JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function getAdminStats(): Promise<{
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  activeThisMonth: number;
  mrr: number;
}> {
  const [total] = await sql`SELECT COUNT(*) as count FROM users`;
  const [pro] = await sql`SELECT COUNT(*) as count FROM users WHERE plan = 'pro'`;
  const [free] = await sql`SELECT COUNT(*) as count FROM users WHERE plan = 'free'`;
  const [active] = await sql`
    SELECT COUNT(*) as count FROM users
    WHERE usage_reset_at > NOW() - INTERVAL '30 days' AND usage_count > 0
  `;
  const proCount = Number(pro.count);
  return {
    totalUsers: Number(total.count),
    proUsers: proCount,
    freeUsers: Number(free.count),
    activeThisMonth: Number(active.count),
    mrr: proCount * 990,
  };
}

export async function searchUsers(query: string, limit = 50): Promise<DbUser[]> {
  if (!query.trim()) {
    const rows = await sql`SELECT * FROM users ORDER BY id DESC LIMIT ${limit}`;
    return rows as DbUser[];
  }
  const pattern = `%${query}%`;
  const rows = await sql`
    SELECT * FROM users
    WHERE email ILIKE ${pattern} OR name ILIKE ${pattern} OR google_id = ${query}
    ORDER BY id DESC LIMIT ${limit}
  `;
  return rows as DbUser[];
}

export async function getUserById(id: number): Promise<DbUser | null> {
  const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
  return (rows[0] as DbUser) ?? null;
}

export async function adminUpdateUser(
  id: number,
  updates: { plan?: string; usage_count?: number; role?: string }
): Promise<DbUser | null> {
  const user = await getUserById(id);
  if (!user) return null;

  if (updates.plan !== undefined) {
    await sql`UPDATE users SET plan = ${updates.plan}, updated_at = NOW() WHERE id = ${id}`;
  }
  if (updates.usage_count !== undefined) {
    await sql`UPDATE users SET usage_count = ${updates.usage_count}, updated_at = NOW() WHERE id = ${id}`;
  }
  if (updates.role !== undefined) {
    await sql`UPDATE users SET role = ${updates.role}, updated_at = NOW() WHERE id = ${id}`;
  }
  return getUserById(id);
}

export async function logAdminAction(
  adminGoogleId: string,
  actionType: string,
  targetUserId: number | null,
  changes: Record<string, unknown>
): Promise<void> {
  await sql`
    INSERT INTO admin_actions (admin_google_id, action_type, target_user_id, changes)
    VALUES (${adminGoogleId}, ${actionType}, ${targetUserId}, ${JSON.stringify(changes)})
  `;
}

export async function getAdminActions(limit = 100, offset = 0): Promise<AdminAction[]> {
  const rows = await sql`
    SELECT * FROM admin_actions
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows as AdminAction[];
}

export async function getSubscriptionUsers(): Promise<DbUser[]> {
  const rows = await sql`
    SELECT * FROM users
    WHERE stripe_subscription_id IS NOT NULL
    ORDER BY id DESC
  `;
  return rows as DbUser[];
}
