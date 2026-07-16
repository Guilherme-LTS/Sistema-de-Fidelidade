import { env } from "./config/env.js";
import { db } from "./infra/database/db.js";
import { tenants } from "./infra/database/schema.js";
import Stripe from "stripe";

async function run() {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia" as any,
  });

  const tenantList = await db.select().from(tenants);
  const tenant = tenantList[0];
  
  if (!tenant || !tenant.stripeCustomerId) {
    console.log("Tenant não encontrado ou sem customer ID");
    process.exit(0);
  }

  console.log("Customer ID:", tenant.stripeCustomerId);

  const customer = await stripe.customers.retrieve(tenant.stripeCustomerId);
  if (customer.deleted) {
    console.log("Customer deletado");
    process.exit(0);
  }
  
  console.log("Test Clock ID:", customer.test_clock);
  
  if (customer.test_clock) {
    const testClock = await stripe.testHelpers.testClocks.retrieve(customer.test_clock as string);
    console.log("Test Clock Details:", {
      id: testClock.id,
      frozen_time: new Date(testClock.frozen_time * 1000).toISOString(),
      status: testClock.status,
    });
    
    const subs = await stripe.subscriptions.list({ customer: customer.id });
    if (subs.data.length > 0) {
      const sub = subs.data[0];
      console.log("Subscription ID:", sub.id);
      console.log("Status:", sub.status);
      if (sub.trial_end) {
        const trialEnd = new Date(sub.trial_end * 1000);
        console.log("Trial End Date:", trialEnd.toISOString());
        
        // Avançando o tempo para 2 dias após o fim do trial
        const advanceTo = new Date(trialEnd.getTime() + 2 * 24 * 60 * 60 * 1000);
        console.log("Advancing to:", advanceTo.toISOString());
        
        await stripe.testHelpers.testClocks.advance(testClock.id, {
          frozen_time: Math.floor(advanceTo.getTime() / 1000),
        });
        console.log("Time advanced! Wait for webhooks.");
      }
    } else {
      console.log("Não tem assinaturas.");
    }
  } else {
    console.log("Este customer NÃO tem test_clock associado.");
  }
}

run().catch(console.error).then(() => process.exit(0));
