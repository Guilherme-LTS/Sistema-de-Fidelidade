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
  redemptions,
  stripeWebhookEvents
} from "../infra/database/schema.js";
import { eq, inArray } from "drizzle-orm";
import { supabaseAuthGateway } from "../infra/auth/supabase-auth.gateway.js";
import { env } from "../config/env.js";
import Stripe from "stripe";

async function purgeAccount() {
  const targetEmail = "guilherme.lucas.ts@gmail.com";
  console.log(`=== INICIANDO PURGA COMPLETA DA CONTA: ${targetEmail} ===\n`);

  const stripeKey = env.STRIPE_SECRET_KEY;
  const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any }) : null;

  // 1. Purga no Stripe
  console.log("1. Auditando e deletando recursos no Stripe...");
  if (stripe) {
    try {
      // Buscar customers pelo email
      const searchRes = await stripe.customers.search({
        query: `email:'${targetEmail}'`,
      });
      console.log(`Encontrados ${searchRes.data.length} clientes no Stripe para ${targetEmail}:`);

      for (const cust of searchRes.data) {
        console.log(`- Processando cliente Stripe ID: ${cust.id}...`);
        
        // Cancelar todas as assinaturas do customer
        const subs = await stripe.subscriptions.list({ customer: cust.id, status: "all" });
        for (const sub of subs.data) {
          if (sub.status !== "canceled") {
            console.log(`  - Cancelando assinatura Stripe ${sub.id}...`);
            await stripe.subscriptions.cancel(sub.id);
          }
        }

        // Cancelar todos os Subscription Schedules
        try {
          const schedules = await stripe.subscriptionSchedules.list({ customer: cust.id });
          for (const sched of schedules.data) {
            if (sched.status !== "canceled" && sched.status !== "released") {
              console.log(`  - Cancelando Subscription Schedule ${sched.id}...`);
              await stripe.subscriptionSchedules.cancel(sched.id);
            }
          }
        } catch (e: any) {
          console.warn("  - Erro ao listar schedules:", e.message);
        }

        // Deletar customer
        console.log(`  - Excluindo customer ${cust.id} do Stripe...`);
        await stripe.customers.del(cust.id);
      }
    } catch (err: any) {
      console.error("Erro na busca/exclusão no Stripe:", err.message);
    }
  } else {
    console.log("Stripe API key não configurada no ambiente.");
  }

  // 2. Buscar e Deletar do Supabase Auth
  console.log("\n2. Purgando do Supabase Auth...");
  const { data: { users }, error: authListErr } = await supabaseAuthGateway.admin.listUsers();
  if (authListErr) {
    console.error("Erro ao listar usuários do Supabase Auth:", authListErr.message);
  } else {
    const matched = users.filter(u => u.email?.toLowerCase() === targetEmail.toLowerCase());
    console.log(`Encontrados ${matched.length} usuários no Supabase Auth:`);
    for (const user of matched) {
      console.log(`- Deletando usuário Supabase Auth ID: ${user.id} (${user.email})...`);
      const { error: delErr } = await supabaseAuthGateway.admin.deleteUser(user.id);
      if (delErr) {
        console.error(`  Erro ao deletar usuário ${user.id} do Supabase Auth:`, delErr.message);
      } else {
        console.log(`  ✅ Usuário ${user.id} deletado com sucesso do Supabase Auth!`);
      }
    }
  }

  // 3. Deletar do Banco de Dados Postgres (Drizzle)
  console.log("\n3. Purgando registros nas tabelas do Postgres...");

  // a. Identificar tenantUsers e tenants
  const allTUsers = await db.select().from(tenantUsers);
  const matchedTUsers = allTUsers.filter(u => (u as any).email?.toLowerCase() === targetEmail.toLowerCase());
  const tenantIdsToDelete = matchedTUsers.map(u => u.tenantId).filter(Boolean) as string[];

  console.log(`Encontrados ${matchedTUsers.length} registros em tenant_users.`);
  console.log(`Identificados ${tenantIdsToDelete.length} tenants associados.`);

  if (tenantIdsToDelete.length > 0) {
    console.log("- Deletando transações dos tenants...");
    await db.delete(transactions).where(inArray(transactions.tenantId, tenantIdsToDelete));

    console.log("- Deletando resgates dos tenants...");
    await db.delete(redemptions).where(inArray(redemptions.tenantId, tenantIdsToDelete));

    console.log("- Deletando convites dos tenants...");
    await db.delete(invitations).where(inArray(invitations.tenantId, tenantIdsToDelete));

    console.log("- Deletando logs de auditoria dos tenants...");
    await db.delete(auditLogs).where(inArray(auditLogs.tenantId, tenantIdsToDelete));

    console.log("- Deletando faturas espelhadas dos tenants...");
    await db.delete(stripeInvoices).where(inArray(stripeInvoices.tenantId, tenantIdsToDelete));

    console.log("- Deletando vínculos de clientes (customers) dos tenants...");
    await db.delete(customers).where(inArray(customers.tenantId, tenantIdsToDelete));

    console.log("- Deletando tenant_users dos tenants...");
    await db.delete(tenantUsers).where(inArray(tenantUsers.tenantId, tenantIdsToDelete));

    console.log("- Deletando tenants...");
    await db.delete(tenants).where(inArray(tenants.id, tenantIdsToDelete));
  }

  // b. Deletar consumerProfiles com esse email
  const allCP = await db.select().from(consumerProfiles);
  const matchedCP = allCP.filter(cp => (cp as any).email?.toLowerCase() === targetEmail.toLowerCase());
  if (matchedCP.length > 0) {
    const cpIds = matchedCP.map(cp => cp.id);
    console.log(`- Deletando ${cpIds.length} perfis em consumer_profiles...`);
    await db.delete(consumerProfiles).where(inArray(consumerProfiles.id, cpIds));
  }

  // c. Deletar qualquer convite avulso para esse email
  const allInvites = await db.select().from(invitations);
  const matchedInvites = allInvites.filter(i => i.email?.toLowerCase() === targetEmail.toLowerCase());
  if (matchedInvites.length > 0) {
    const invIds = matchedInvites.map(i => i.id);
    console.log(`- Deletando ${invIds.length} convites em invitations...`);
    await db.delete(invitations).where(inArray(invitations.id, invIds));
  }

  console.log("\n✅ PURGA CONCLUÍDA COM SUCESSO!");
  process.exit(0);
}

purgeAccount();
