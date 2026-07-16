import Stripe from "stripe";
import { env } from "../config/env.js";
import { db } from "../infra/database/db.js";
import { tenants } from "../infra/database/schema.js";
import { eq } from "drizzle-orm";

const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia" as any,
});

async function run() {
  const emails = ["guilherme.lucas.ts@gmail.com", "glts.snf21@uea.edu.br"];

  for (const email of emails) {
    console.log(`\n========================================`);
    console.log(`INSPECIONANDO: ${email}`);
    console.log(`========================================`);
    
    // 1. Local Database
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.email, email),
    });

    if (!tenant) {
      console.log("-> Tenant NÃO encontrado no banco local.");
      continue;
    }

    console.log(`[BANCO LOCAL]`);
    console.log(` - ID: ${tenant.id}`);
    console.log(` - Stripe Customer ID: ${tenant.stripeCustomerId}`);
    console.log(` - Stripe Subscription ID: ${tenant.stripeSubscriptionId}`);
    console.log(` - Status: ${tenant.subscriptionStatus}`);
    console.log(` - Price ID: ${tenant.subscriptionPriceId}`);

    if (!tenant.stripeCustomerId) {
      console.log("-> Sem Customer ID na Stripe vinculado.");
      continue;
    }

    // 2. Stripe API
    try {
      const customer = await stripe.customers.retrieve(tenant.stripeCustomerId);
      console.log(`\n[STRIPE - CUSTOMER]`);
      if (customer.deleted) {
        console.log(" - Cliente deletado na Stripe.");
      } else {
        console.log(` - Email: ${customer.email}`);
        
        const subs = await stripe.subscriptions.list({
          customer: tenant.stripeCustomerId,
          status: "all"
        });

        console.log(`\n[STRIPE - ASSINATURAS (${subs.data.length} encontradas)]`);
        for (const sub of subs.data) {
          console.log(` - Sub ID: ${sub.id}`);
          console.log(`   - Status: ${sub.status}`);
          console.log(`   - Cancel at period end: ${sub.cancel_at_period_end}`);
          console.log(`   - Price ID: ${sub.items.data[0]?.price.id}`);
        }
      }
    } catch (err: any) {
      console.log(`-> Erro ao consultar Stripe: ${err.message}`);
    }
  }
  
  process.exit(0);
}

run();
