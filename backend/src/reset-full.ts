import { db } from "./infra/database/db.js";
import { tenants, tenantUsers, auditLogs, stripeWebhookEvents } from "./infra/database/schema.js";
import { env } from "./config/env.js";
import Stripe from "stripe";
import { sql } from "drizzle-orm";

async function run() {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia" as any,
  });

  console.log("Limpiando banco de dados local...");
  
  try {
    console.log("Deletando usuários no Supabase Auth...");
    await db.execute(sql`DELETE FROM auth.users`);
    console.log("Usuários do Supabase Auth deletados (Cascade)!");
  } catch (err: any) {
    console.error("Aviso: não foi possível deletar do auth.users. O DB_URL pode não ter privilégios:", err.message);
  }

  // Se o cascade não limpar as tabelas (caso de erro), tentamos limpar manualmente as tabelas locais
  try {
    await db.delete(auditLogs);
    await db.delete(stripeWebhookEvents);
    await db.delete(tenantUsers);
    await db.delete(tenants);
    console.log("Tabelas locais limpas.");
  } catch (err: any) {
    console.log("Aviso ao limpar tabelas locais:", err.message);
  }
  
  console.log("Limpando Stripe Customers...");
  const customers = await stripe.customers.list({ limit: 100 });
  for (const c of customers.data) {
    try {
      await stripe.customers.del(c.id);
      console.log(`Deletado Stripe Customer: ${c.id}`);
    } catch (e) {
      console.error(`Erro ao deletar ${c.id}`);
    }
  }

  console.log("Reset total concluído!");
}

run().then(() => process.exit(0)).catch(console.error);
