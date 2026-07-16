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
  await db.delete(auditLogs);
  await db.delete(stripeWebhookEvents);
  await db.delete(tenantUsers);
  await db.delete(tenants);
  
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

  console.log("Reset concluído!");
}

run().then(() => process.exit(0)).catch(console.error);
