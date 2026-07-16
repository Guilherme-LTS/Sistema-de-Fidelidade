import { db } from "../infra/database/db.js";
import { 
  transactions, 
  redemptions, 
  invitations, 
  auditLogs, 
  stripeWebhookEvents, 
  customers, 
  consumerProfiles, 
  tenantUsers,
  tenants
} from "../infra/database/schema.js";
import { not, eq, and, isNotNull } from "drizzle-orm";
import { supabaseAuthGateway } from "../infra/auth/supabase-auth.gateway.js";

async function resetDb() {
  console.log("=== INICIANDO RESET SEGURO DO BANCO DE DADOS ===");
  try {
    // 1. Encontrar todos os operadores vinculados a qualquer restaurante
    console.log("1. Buscando usuários operadores adicionais...");
    const operators = await db.query.tenantUsers.findMany({
      where: and(
        not(eq(tenantUsers.role, "admin")),
        isNotNull(tenantUsers.userId)
      ),
    });

    console.log(`Encontrados ${operators.length} operadores para remover do Supabase Auth.`);

    // 2. Excluir operadores do Supabase Auth
    for (const op of operators) {
      if (op.userId) {
        console.log(`Removendo usuário ${op.name} (${op.userId}) do Supabase...`);
        const { error } = await supabaseAuthGateway.admin.deleteUser(op.userId);
        if (error) {
          console.error(`Erro ao remover do Supabase: ${error.message}`);
        } else {
          console.log(`Usuário ${op.name} removido com sucesso.`);
        }
      }
    }

    // 3. Limpar tabelas operacionais
    console.log("\n2. Limpando tabelas de fidelidade e equipe...");

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

    console.log("- Deletando vínculos de clientes...");
    await db.delete(customers);

    console.log("- Deletando perfis de CPF...");
    await db.delete(consumerProfiles);

    console.log("- Deletando operadores de tenant_users (mantendo donos/admins)...");
    await db.delete(tenantUsers).where(not(eq(tenantUsers.role, "admin")));

    // 4. Resetar configurações dos Tenants ativos para Trial limpo (opcional)
    console.log("\n3. Resetando status de assinatura dos restaurantes ativos para trialing padrão...");
    await db.update(tenants).set({
      subscriptionStatus: "trialing",
      subscriptionPriceId: null,
      stripeSubscriptionId: null,
      subscriptionCurrentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    console.log("\n✅ BANCO DE DADOS LIMPO E PRESERVADO COM SUCESSO!");
  } catch (error) {
    console.error("❌ Erro durante o reset do banco de dados:", error);
  }
  process.exit(0);
}

resetDb();
