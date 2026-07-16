import Stripe from "stripe";
import { env } from "../config/env.js";
import { db } from "../infra/database/db.js";
import { tenants } from "../infra/database/schema.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia" as any,
});

async function run() {
  console.log("=== TODOS OS TENANTS NO BANCO LOCAL ===");
  const allTenants = await db.query.tenants.findMany();
  for (const tenant of allTenants) {
    console.log(`\nTenant ID: ${tenant.id}`);
    console.log(`Name: ${tenant.name}`);
    console.log(`Email: ${tenant.email}`);
    console.log(`Stripe Customer: ${tenant.stripeCustomerId}`);
    console.log(`Stripe Subscription: ${tenant.stripeSubscriptionId}`);
    console.log(`Local Status: ${tenant.subscriptionStatus}`);
    console.log(`Current Period End: ${tenant.subscriptionCurrentPeriodEnd}`);
    console.log(`Cancel At Period End: ${tenant.cancelAtPeriodEnd}`);

    if (tenant.stripeCustomerId) {
      try {
        const stripeCust = await stripe.customers.retrieve(tenant.stripeCustomerId);
        if (stripeCust.deleted) {
          console.log("[Stripe] Customer DELETED");
        } else {
          console.log(`[Stripe] Customer Email: ${stripeCust.email}`);
          const subs = await stripe.subscriptions.list({
            customer: tenant.stripeCustomerId,
            status: "all"
          });
          console.log(`[Stripe] Subscriptions (${subs.data.length}):`);
          for (const subRaw of subs.data) {
            const sub = subRaw as any;
            console.log(`  - Sub ID: ${sub.id}`);
            console.log(`    Status: ${sub.status}`);
            console.log(`    Cancel At Period End: ${sub.cancel_at_period_end}`);
            console.log(`    Current Period End: ${new Date(sub.current_period_end * 1000).toISOString()}`);
            console.log(`    Default Payment Method: ${sub.default_payment_method}`);
            
            // List invoices for this sub
            const invoices = await stripe.invoices.list({
              subscription: sub.id,
              limit: 5
            });
            console.log(`    Invoices for this sub (${invoices.data.length}):`);
            for (const invRaw of invoices.data) {
              const inv = invRaw as any;
              console.log(`      * Inv ID: ${inv.id}`);
              console.log(`        Total: ${inv.total / 100} BRL`);
              console.log(`        Amount Paid: ${inv.amount_paid / 100} BRL`);
              console.log(`        Amount Due: ${inv.amount_due / 100} BRL`);
              console.log(`        Status: ${inv.status}`);
              console.log(`        Created: ${new Date(inv.created * 1000).toISOString()}`);
              const piStatus = inv.payment_intent ? (await stripe.paymentIntents.retrieve(inv.payment_intent as string)).status : "N/A";
              console.log(`        Payment Intent Status: ${piStatus}`);
            }
          }
        }
      } catch (err: any) {
        console.error(`Error retrieving stripe details: ${err.message}`);
      }
    }
  }
  process.exit(0);
}

run().catch(console.error);
