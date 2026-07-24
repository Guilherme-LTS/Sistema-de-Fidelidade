import { db } from "../infra/database/db.js";
import { 
  tenantUsers, 
  tenants, 
  consumerProfiles, 
  customers, 
  invitations, 
  auditLogs, 
  stripeInvoices
} from "../infra/database/schema.js";
import { supabaseAuthGateway } from "../infra/auth/supabase-auth.gateway.js";
import { env } from "../config/env.js";
import Stripe from "stripe";

async function verify() {
  const email = "guilherme.lucas.ts@gmail.com";
  console.log(`=== VERIFICAÇÃO FINAL DE PURGA: ${email} ===\n`);

  // 1. Supabase Auth
  const { data: authData, error: authErr } = await supabaseAuthGateway.admin.listUsers();
  if (authErr) {
    console.log("Supabase Auth listUsers status:", authErr.message);
  } else {
    const authUsers = authData.users.filter(u => u.email?.toLowerCase() === email.toLowerCase());
    console.log(`1. Supabase Auth users com email '${email}': ${authUsers.length}`);
  }

  // 2. Stripe API
  const stripeKey = env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });
    const searchRes = await stripe.customers.search({
      query: `email:'${email}'`,
    });
    console.log(`2. Stripe customers com email '${email}': ${searchRes.data.length}`);
  }

  // 3. Database Postgres
  const allTUsers = await db.select().from(tenantUsers);
  const matchedTUsers = allTUsers.filter(u => (u as any).email?.toLowerCase() === email.toLowerCase());
  console.log(`3. tenant_users com email '${email}': ${matchedTUsers.length}`);

  const allCP = await db.select().from(consumerProfiles);
  const matchedCP = allCP.filter(cp => (cp as any).email?.toLowerCase() === email.toLowerCase());
  console.log(`4. consumer_profiles com email '${email}': ${matchedCP.length}`);

  const allInv = await db.select().from(invitations);
  const matchedInv = allInv.filter(inv => inv.email?.toLowerCase() === email.toLowerCase());
  console.log(`5. invitations com email '${email}': ${matchedInv.length}`);

  console.log("\n=== VERIFICAÇÃO CONCLUÍDA ===");
  process.exit(0);
}

verify();
