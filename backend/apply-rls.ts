import { db } from "./src/infra/database/db.js";
import { sql } from "drizzle-orm";

async function applyRLS() {
  try {
    console.log("Applying RLS policies to all tables...");

    const queries = [
      // 1. Enable RLS on all tables
      `ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE consumer_profiles ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE customers ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE redemption_items ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE expirations ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE expiration_items ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;`,

      // 2. Drop existing policies to recreate them cleanly
      `DROP POLICY IF EXISTS "tenant_isolation" ON tenants;`,
      `DROP POLICY IF EXISTS "tenant_isolation" ON tenant_users;`,
      `DROP POLICY IF EXISTS "tenant_isolation" ON customers;`,
      `DROP POLICY IF EXISTS "tenant_isolation" ON transactions;`,
      `DROP POLICY IF EXISTS "tenant_isolation" ON rewards;`,
      `DROP POLICY IF EXISTS "tenant_isolation" ON redemptions;`,
      `DROP POLICY IF EXISTS "tenant_isolation" ON redemption_items;`,
      `DROP POLICY IF EXISTS "tenant_isolation" ON expirations;`,
      `DROP POLICY IF EXISTS "tenant_isolation" ON expiration_items;`,
      `DROP POLICY IF EXISTS "tenant_isolation" ON invitations;`,
      `DROP POLICY IF EXISTS "consumer_profile_isolation" ON consumer_profiles;`,
      `DROP POLICY IF EXISTS "bypass_rls_for_service_role" ON consumer_profiles;`,

      // 3. Create policies
      
      // Tenants: A tenant can only see its own record
      `CREATE POLICY "tenant_isolation" ON tenants
       USING (id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);`,

      // Tenant Users: Users can only see records for their current tenant context
      `CREATE POLICY "tenant_isolation" ON tenant_users
       USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);`,

      // Customers: Isolated by tenant_id
      `CREATE POLICY "tenant_isolation" ON customers
       USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);`,

      // Transactions: Isolated by tenant_id
      `CREATE POLICY "tenant_isolation" ON transactions
       USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);`,

      // Rewards: Isolated by tenant_id
      `CREATE POLICY "tenant_isolation" ON rewards
       USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);`,

      // Redemptions: Isolated by tenant_id
      `CREATE POLICY "tenant_isolation" ON redemptions
       USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);`,

      // Redemption Items: Isolated by checking the parent redemption's tenant_id
      `CREATE POLICY "tenant_isolation" ON redemption_items
       USING (
         redemption_id IN (
           SELECT id FROM redemptions WHERE tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
         )
       );`,

      // Expirations: Isolated by tenant_id
      `CREATE POLICY "tenant_isolation" ON expirations
       USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);`,

      // Expiration Items: Isolated by checking the parent expiration's tenant_id
      `CREATE POLICY "tenant_isolation" ON expiration_items
       USING (
         expiration_id IN (
           SELECT id FROM expirations WHERE tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
         )
       );`,

      // Invitations: Isolated by tenant_id or matching email in claims
      `CREATE POLICY "tenant_isolation" ON invitations
       USING (
         tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
         OR
         email = NULLIF(current_setting('request.jwt.claims', true)::json->>'email', '')
       );`,

      // Consumer Profiles: Global table. Allow all operations since it is the global identity, 
      // but in a strict scenario it might only allow viewing if they have a customer link.
      // For simplicity in this architecture, we will allow tenant operators to view profiles
      // or we can just leave it accessible for the service role. The service role bypasses RLS anyway.
      // Actually, if we use the backend API, the backend connects as Postgres (superuser) which bypasses RLS,
      // UNLESS we use appDb. If we use appDb and set `app.current_tenant`, consumer_profiles doesn't have a tenant_id.
      // To allow the app to read consumer_profiles, we can just allow it broadly for authenticated requests,
      // or we just rely on the backend service role for profile lookups.
      // Let's create a policy that allows everything for consumer_profiles so it doesn't block the backend if it uses appDb.
      `CREATE POLICY "consumer_profile_isolation" ON consumer_profiles
       USING (true);`
    ];

    for (const q of queries) {
      await db.execute(sql.raw(q));
    }

    console.log("RLS policies applied successfully!");
  } catch (err) {
    console.error("Failed to apply RLS:", err);
  }
  process.exit(0);
}

applyRLS();
