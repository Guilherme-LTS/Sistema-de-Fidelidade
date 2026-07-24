import { db } from "../infra/database/db.js";
import { 
  transactions, 
  redemptions, 
  invitations, 
  auditLogs, 
  stripeWebhookEvents, 
  stripeInvoices,
  customers, 
  consumerProfiles, 
  tenantUsers,
  tenants
} from "../infra/database/schema.js";
import { not, eq, and, isNotNull } from "drizzle-orm";
import { env } from "../config/env.js";
import Stripe from "stripe";

async function resetDbAndStripe() {
  console.log("=== INICIANDO RESET COMPLETO DE BANCO DE DADOS E STRIPE PRODUÇÃO ===");

  const stripeKey = env.STRIPE_SECRET_KEY;
  const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any }) : null;

  try {
    // 1. Buscar todos os tenants e cancelar assinaturas / clientes no Stripe
    console.log("1. Auditando e limpando registros no Stripe...");
    const allTenants = await db.select().from(tenants);

    for (const t of allTenants) {
      if (stripe && t.stripeCustomerId) {
        console.log(`Limpando dados no Stripe para Tenant ${t.name} (Customer: ${t.stripeCustomerId})...`);
        try {
          // Listar e cancelar todas as assinaturas do cliente no Stripe
          const subs = await stripe.subscriptions.list({ customer: t.stripeCustomerId, status: "all" });
          for (const s of subs.data) {
            if (s.status !== "canceled") {
              console.log(`- Cancelando assinatura ${s.id} (Status: ${s.status})...`);
              await stripe.subscriptions.cancel(s.id);
            }
          }
          // Deletar o customer no Stripe
          console.log(`- Excluindo customer ${t.stripeCustomerId} no Stripe...`);
          await stripe.customers.del(t.stripeCustomerId);
        } catch (err: any) {
          console.warn(`Aviso ao limpar Stripe para ${t.stripeCustomerId}:`, err.message);
        }
      }
    }

    // 2. Limpar operadores no Supabase se houver (opcional)
    console.log("\n2. Limpando tabelas operacionais e históricos...");

    console.log("- Deletando transações de pontos...");
    await db.delete(transactions);

    console.log("- Deletando resgates de prêmios...");
    await db.delete(redemptions);

    console.log("- Deletando convites de equipe...");
    await db.delete(invitations);

    console.log("- Deletando logs de auditoria...");
    await db.delete(auditLogs);

    console.log("- Deletando eventos de webhook do Stripe (idempotência)...");
    await db.delete(stripeWebhookEvents);

    console.log("- Deletando faturas espelhadas do Stripe...");
    await db.delete(stripeInvoices);

    console.log("- Deletando vínculos de clientes do estabelecimento...");
    await db.delete(customers);

    console.log("- Deletando perfis de CPF...");
    await db.delete(consumerProfiles);

    console.log("- Deletando operadores adicionais da equipe...");
    await db.delete(tenantUsers).where(not(eq(tenantUsers.role, "admin")));

    // 3. Resetar Tenants para Trial Limpo de 14 Dias
    console.log("\n3. Resetando todos os estabelecimentos para Trial limpo de 14 dias...");
    const trialEndISO = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    
    await db.update(tenants).set({
      subscriptionStatus: "trialing",
      subscriptionPriceId: null,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      subscriptionCurrentPeriodEnd: trialEndISO,
      cancelAtPeriodEnd: false,
      stripeSubscriptionLastEventAt: null,
      stripeBillingCachedDetails: null,
      stripeBillingLastSyncedAt: null,
    });

    console.log("\n✅ RESET CONCLUÍDO COM SUCESSO! Banco de dados zerado e Stripe limpo.");
  } catch (error) {
    console.error("❌ Erro durante o reset:", error);
  }
  process.exit(0);
}

resetDbAndStripe();
