import "dotenv/config";
import Stripe from "stripe";
import { db } from "../infra/database/db.js";
import { tenants } from "../infra/database/schema.js";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-01-27.acacia" as any,
});

async function advanceTime() {
  const emailArgs = process.argv[2];
  const daysArgs = parseInt(process.argv[3], 10) || 30;

  if (!emailArgs) {
    console.error("Uso: npm run dev:advance-time <email_do_tenant> [dias_para_avancar_default_30]");
    process.exit(1);
  }

  console.log(`[Time Travel] Buscando tenant com email: ${emailArgs}...`);

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.email, emailArgs),
  });

  if (!tenant) {
    console.error("[Time Travel] Tenant não encontrado no banco.");
    process.exit(1);
  }

  if (!tenant.stripeCustomerId) {
    console.error("[Time Travel] Este tenant não possui uma conta na Stripe.");
    process.exit(1);
  }

  console.log(`[Time Travel] Recuperando Customer ${tenant.stripeCustomerId}...`);
  const customer = await stripe.customers.retrieve(tenant.stripeCustomerId);

  if (customer.deleted) {
    console.error("[Time Travel] O Customer foi deletado na Stripe.");
    process.exit(1);
  }

  const testClockId = (customer as Stripe.Customer).test_clock;

  if (!testClockId) {
    console.error("[Time Travel] Este Customer não possui um Test Clock associado.");
    console.error("Aviso: Apenas Customers recém-criados no ambiente DEV (após a implementação) possuem o Test Clock.");
    console.error("Por favor, resete o ambiente e crie uma nova conta.");
    process.exit(1);
  }

  console.log(`[Time Travel] Test Clock encontrado: ${testClockId}`);
  
  // Buscar o test clock
  let testClock;
  if (typeof testClockId === 'string') {
    testClock = await stripe.testHelpers.testClocks.retrieve(testClockId);
  } else {
    testClock = testClockId;
  }

  const advanceTo = testClock.frozen_time + (daysArgs * 24 * 60 * 60);

  console.log(`[Time Travel] Avançando o tempo em ${daysArgs} dias (Timestamp: ${advanceTo})...`);
  console.log(`[Time Travel] Atenção: A Stripe pode demorar 1-2 minutos para processar a simulação e disparar os Webhooks!`);

  const advancedClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
    frozen_time: advanceTo,
  });

  console.log(`[Time Travel] Test Clock avançado com sucesso.`);
  console.log(`[Time Travel] O Status atual é: ${advancedClock.status} (Isso mudará para "ready" quando a Stripe concluir a simulação).`);
  
  console.log(`\nAgora você pode voltar ao painel e aguardar os Webhooks locais serem processados!`);
  process.exit(0);
}

advanceTime().catch((err) => {
  console.error("Erro fatal na máquina do tempo:", err);
  process.exit(1);
});
