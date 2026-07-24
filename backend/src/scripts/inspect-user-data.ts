import { db } from "../infra/database/db.js";
import { 
  tenantUsers, 
  tenants, 
  consumerProfiles, 
  customers, 
  invitations, 
  auditLogs, 
  stripeInvoices,
  transactions,
  redemptions
} from "../infra/database/schema.js";
import { eq, sql } from "drizzle-orm";
import { supabaseAuthGateway } from "../infra/auth/supabase-auth.gateway.js";

async function inspectUser() {
  const targetEmail = "guilherme.lucas.ts@gmail.com";
  console.log(`=== AUDITANDO REGISTROS PARA: ${targetEmail} ===\n`);

  // 1. Supabase Auth
  console.log("--- 1. Supabase Auth Users ---");
  const { data: { users }, error: authErr } = await supabaseAuthGateway.admin.listUsers();
  if (authErr) {
    console.error("Erro ao listar Supabase Auth:", authErr.message);
  } else {
    const matchedAuthUsers = users.filter(u => u.email?.toLowerCase() === targetEmail.toLowerCase());
    console.log(`Encontrados ${matchedAuthUsers.length} usuários no Supabase Auth:`);
    matchedAuthUsers.forEach(u => console.log(`  - ID: ${u.id}, Email: ${u.email}, CreatedAt: ${u.created_at}`));
  }

  // 2. Tenant Users (Equipe/Admins)
  console.log("\n--- 2. Tenant Users ---");
  const allTUsers = await db.select().from(tenantUsers);
  const tUsers = allTUsers.filter(u => (u as any).email?.toLowerCase() === targetEmail.toLowerCase());
  console.log(`Encontrados ${tUsers.length} registros em tenant_users:`);
  tUsers.forEach(u => console.log(`  - ID: ${u.id}, TenantId: ${u.tenantId}, Role: ${u.role}, Name: ${u.name}`));

  // 3. Tenants associados
  console.log("\n--- 3. Tenants ---");
  const tenantIds = tUsers.map(u => u.tenantId).filter(Boolean) as string[];
  if (tenantIds.length > 0) {
    for (const tId of tenantIds) {
      const [t] = await db.select().from(tenants).where(eq(tenants.id, tId));
      if (t) {
        console.log(`  - Tenant ID: ${t.id}, Name: ${t.name}, Slug: ${t.slug}, StripeCustomer: ${t.stripeCustomerId}, StripeSub: ${t.stripeSubscriptionId}`);
      }
    }
  } else {
    console.log("Nenhum tenant associado diretamente via tenant_users.");
  }

  // 4. Consumer Profiles (CPFs / Portal do Cliente)
  console.log("\n--- 4. Consumer Profiles ---");
  const allCP = await db.select().from(consumerProfiles);
  const cProfiles = allCP.filter(cp => (cp as any).email?.toLowerCase() === targetEmail.toLowerCase());
  console.log(`Encontrados ${cProfiles.length} registros em consumer_profiles:`);
  cProfiles.forEach(cp => console.log(`  - ID: ${cp.id}, Document: ${cp.document}, AuthUserId: ${cp.authUserId}, Name: ${cp.name}`));

  // 5. Convites Pendentes
  console.log("\n--- 5. Invitations ---");
  const allInv = await db.select().from(invitations);
  const invites = allInv.filter(inv => inv.email?.toLowerCase() === targetEmail.toLowerCase());
  console.log(`Encontrados ${invites.length} registros em invitations:`);
  invites.forEach(inv => console.log(`  - ID: ${inv.id}, TenantId: ${inv.tenantId}, Status: ${inv.status}`));

  console.log("\n=== FIM DA INSPEÇÃO ===");
  process.exit(0);
}

inspectUser();
