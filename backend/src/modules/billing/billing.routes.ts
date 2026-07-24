import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../../shared/security/require-auth.js";
import { requireRole } from "../../shared/security/require-role.js";
import { successResponse } from "../../shared/http/response.js";
import { stripeService } from "./stripe.service.js";
import { db } from "../../infra/database/db.js";
import { tenants, stripeWebhookEvents, stripeInvoices } from "../../infra/database/schema.js";
import { eq } from "drizzle-orm";
import { AppError } from "../../shared/errors/app-error.js";
import { env } from "../../config/env.js";
import Stripe from "stripe";
import { planLimitService } from "./plan-limit.service.js";

export async function billingRoutes(app: FastifyInstance) {
  // Sobrescreve o parser de JSON nesta rota/plugin para capturar o raw body (Buffer) necessário para a assinatura do Stripe Webhook
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
    if (req.url.includes("/webhook")) {
      done(null, body);
    } else {
      try {
        const json = JSON.parse(body.toString("utf8"));
        done(null, json);
      } catch (err: any) {
        err.statusCode = 400;
        done(err, undefined);
      }
    }
  });

  /**
   * POST /billing/checkout
   * Cria uma sessão de checkout do Stripe para assinatura.
   */
  app.post(
    "/checkout",
    {
      preHandler: [requireAuth, requireRole(["admin"])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const { priceId } = request.body as { priceId: string };

      if (!priceId) {
        throw new AppError("O campo priceId é obrigatório.", 400);
      }

      // Mapear aliases amigáveis para chaves reais do Stripe
      const priceMap: Record<string, string | undefined> = {

        pro_mensal: env.STRIPE_PRICE_PRO_MENSAL,
        pro_anual: env.STRIPE_PRICE_PRO_ANUAL,
      };

      const resolvedPriceId = priceMap[priceId] || priceId; // Fallback se passar a key real direto

      if (!resolvedPriceId || resolvedPriceId.startsWith("price_1Pq34a...")) {
        throw new AppError("O ID do plano correspondente não está configurado no servidor.", 500);
      }

      const result = await db.transaction(async (tx) => {
        // 1. Trava pessimista da linha do tenant para evitar concorrência paralela
        const [tenant] = await tx
          .select()
          .from(tenants)
          .where(eq(tenants.id, user.tenantId))
          .for("update");

        if (!tenant) {
          throw new AppError("Estabelecimento não encontrado.", 404);
        }

        // 2. Bloqueio preventivo local se o banco operacional já tiver registro ativo
        if (tenant.stripeSubscriptionId && ["active", "past_due"].includes(tenant.subscriptionStatus || "")) {
          throw new AppError("Você já possui uma assinatura ativa ou pendente.", 400);
        }

        // 3. Chama a Stripe passando a transação (tx) para double-check
        return await stripeService.createCheckoutSession(user.tenantId, resolvedPriceId, tx);
      });

      if (result.alreadySubscribed) {
        return reply.status(200).send({
          success: true,
          data: {
            url: null,
            alreadySubscribed: true,
          },
        });
      }

      return successResponse({ url: result.url });
    }
  );

  /**
   * POST /billing/sync-checkout
   * Sincroniza síncronamente o status de checkout do restaurante a partir do Stripe Session ID.
   */
  app.post(
    "/sync-checkout",
    {
      preHandler: [requireAuth, requireRole(["admin"])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const { sessionId } = request.body as { sessionId: string };

      if (!sessionId) {
        throw new AppError("O campo sessionId é obrigatório.", 400);
      }

      const updated = await stripeService.syncCheckoutSession(sessionId, user.tenantId);
      return successResponse({ success: updated }, updated ? "Assinatura sincronizada com sucesso." : "Pagamento ainda pendente.");
    }
  );

  /**
   * POST /billing/onboarding-complete
   * Marca o onboarding de Trial do restaurante como visualizado.
   */
  app.post(
    "/onboarding-complete",
    {
      preHandler: [requireAuth, requireRole(["admin"])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      await db
        .update(tenants)
        .set({ trialOnboardingShown: true })
        .where(eq(tenants.id, user.tenantId));
      return successResponse({ success: true }, "Onboarding concluído.");
    }
  );

  /**
   * GET /billing/plans
   * Retorna os planos de assinatura disponíveis com valores reais da Stripe.
   */
  app.get(
    "/plans",
    {
      preHandler: [requireAuth, requireRole(["admin"])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const plans = await stripeService.getAvailablePlans();
      return successResponse(plans);
    }
  );

  /**
   * GET /billing/subscription-details
   * Retorna os dados completos da assinatura do Stripe, faturas e métodos de pagamento do restaurante.
   */
  app.get(
    "/subscription-details",
    {
      preHandler: [requireAuth, requireRole(["admin"])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const details = await stripeService.getSubscriptionDetails(user.tenantId);
      return successResponse(details || {});
    }
  );

  /**
   * POST /billing/change-plan
   * Realiza a alteração de plano (upgrade/downgrade) diretamente na Stripe via API.
   */
  app.post(
    "/change-plan",
    {
      preHandler: [requireAuth, requireRole(["admin"])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const { priceId, isUpgrade = false } = request.body as { priceId: string; isUpgrade?: boolean };

      if (!priceId) {
        throw new AppError("O campo priceId é obrigatório.", 400);
      }

      // Mapear aliases amigáveis para chaves reais do Stripe
      const priceMap: Record<string, string | undefined> = {

        pro_mensal: env.STRIPE_PRICE_PRO_MENSAL,
        pro_anual: env.STRIPE_PRICE_PRO_ANUAL,
      };

      const resolvedPriceId = priceMap[priceId] || priceId;

      if (!resolvedPriceId || resolvedPriceId.startsWith("price_1Pq34a...")) {
        throw new AppError("O ID do plano correspondente não está configurado no servidor.", 500);
      }

      await stripeService.changePlan(user.tenantId, resolvedPriceId, isUpgrade);
      return successResponse({ success: true }, "Plano alterado com sucesso.");
    }
  );

  /**
   * POST /billing/cancel
   * Agenda o cancelamento da assinatura para o final do ciclo de cobrança.
   */
  app.post(
    "/cancel",
    {
      preHandler: [requireAuth, requireRole(["admin"])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      await stripeService.cancelSubscription(user.tenantId);
      return successResponse({ success: true }, "Assinatura programada para cancelamento.");
    }
  );

  /**
   * POST /billing/resume
   * Reativa a assinatura pendente de cancelamento.
   */
  app.post(
    "/resume",
    {
      preHandler: [requireAuth, requireRole(["admin"])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      await stripeService.resumeSubscription(user.tenantId);
      return successResponse({ success: true }, "Assinatura reativada com sucesso.");
    }
  );

  /**
   * POST /billing/portal-card
   * Gera o link do portal da Stripe focado na atualização do cartão de crédito.
   */
  app.post(
    "/portal-card",
    {
      preHandler: [requireAuth, requireRole(["admin"])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const url = await stripeService.createCardUpdateSession(user.tenantId);
      return successResponse({ url });
    }
  );

  /**
   * POST /billing/portal
   * Redireciona o lojista para o Stripe Customer Portal.
   */
  app.post(
    "/portal",
    {
      preHandler: [requireAuth, requireRole(["admin"])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const portalUrl = await stripeService.createPortalSession(user.tenantId);
      return successResponse({ url: portalUrl });
    }
  );

  /**
   * POST /billing/webhook
   * Endpoint de Webhook público do Stripe.
   */
  app.post(
    "/webhook",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers["stripe-signature"] as string | undefined;

      if (!signature) {
        app.log.warn("[Stripe Webhook] Requisição sem stripe-signature");
        return reply.code(400).send({ error: "stripe-signature header missing" });
      }

      const rawBody = request.body as Buffer;
      let event: Stripe.Event;

      try {
        event = stripeService.constructWebhookEvent(rawBody, signature);
      } catch (err: any) {
        app.log.error(`[Stripe Webhook] Falha ao verificar assinatura: ${err.message}`);
        return reply.code(400).send({ error: `Webhook error: ${err.message}` });
      }

      app.log.info(`[Stripe Webhook] Recebido evento: ${event.type} (ID: ${event.id})`);

      // 1. Garantir Idempotência
      try {
        await db.insert(stripeWebhookEvents).values({ id: event.id });
      } catch (dbErr: any) {
        // Código 23505 é erro de chave única (Unique Constraint / Primary Key Violation) no Postgres
        if (dbErr.code === "23505" || dbErr.message?.includes("unique constraint")) {
          app.log.info(`[Stripe Webhook] Evento duplicado ignorado (ID: ${event.id})`);
          return reply.code(200).send({ received: true, ignored: true });
        }
        app.log.error(`[Stripe Webhook] Erro ao gravar evento de idempotência: ${dbErr.message}`);
        throw dbErr;
      }

      // 2. Processar Eventos
      try {
        switch (event.type) {
          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            const status = subscription.status;
            const priceId = subscription.items.data[0]?.price.id;
            
            // Suporte defensivo a versões de API antigas e novas (onde o período foi para os items)
            const currentPeriodEndUnix = status === "trialing"
              ? (subscription.trial_end ?? subscription.items?.data?.[0]?.current_period_end)
              : (subscription.items?.data?.[0]?.current_period_end ?? subscription.trial_end);
            const periodEnd = currentPeriodEndUnix
              ? new Date(currentPeriodEndUnix * 1000).toISOString()
              : null;

            await db.transaction(async (tx) => {
              // Buscar Tenant com base no customerId usando bloqueio de linha FOR UPDATE
              const [tenant] = await tx
                .select()
                .from(tenants)
                .where(eq(tenants.stripeCustomerId, customerId))
                .for("update");

              if (tenant) {
                // Proteção contra Webhooks fora de ordem (Out-of-Order Events)
                if (
                  tenant.stripeSubscriptionId === subscription.id &&
                  tenant.stripeSubscriptionLastEventAt &&
                  event.created <= tenant.stripeSubscriptionLastEventAt
                ) {
                  app.log.warn(`[Stripe Webhook] Ignorando evento ${event.type} fora de ordem para o tenant ${tenant.id} (Criado em: ${event.created}, Último processado: ${tenant.stripeSubscriptionLastEventAt})`);
                  return;
                }

                // Deduplicação Ativa: Se o tenant já tem uma assinatura ativa DIFERENTE desta nova
                if (
                  event.type === "customer.subscription.created" &&
                  tenant.stripeSubscriptionId &&
                  tenant.stripeSubscriptionId !== subscription.id &&
                  ["active", "trialing", "past_due"].includes(tenant.subscriptionStatus || "")
                ) {
                  app.log.warn(`[Stripe Webhook] Detectada assinatura duplicada para o tenant ${tenant.id}. Cancelando nova assinatura ${subscription.id}`);
                  await stripeService.cancelDuplicateSubscription(subscription.id);
                  return;
                }

                await tx
                  .update(tenants)
                  .set({
                    stripeSubscriptionId: subscription.id,
                    subscriptionStatus: status,
                    subscriptionPriceId: priceId,
                    subscriptionCurrentPeriodEnd: periodEnd,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
                    stripeSubscriptionLastEventAt: event.created,
                    stripeBillingCachedDetails: null,
                    stripeBillingLastSyncedAt: null,
                  })
                  .where(eq(tenants.id, tenant.id));
                
                app.log.info(`[Stripe Webhook] Tenant ${tenant.id} atualizado para status: ${status}`);
              } else {
                app.log.warn(`[Stripe Webhook] Customer ${customerId} não associado a nenhum Tenant ativo.`);
              }
            });
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            await db.transaction(async (tx) => {
              // Buscar Tenant com bloqueio de linha FOR UPDATE
              const [tenant] = await tx
                .select()
                .from(tenants)
                .where(eq(tenants.stripeCustomerId, customerId))
                .for("update");

              if (tenant) {
                // Proteção contra Webhooks fora de ordem (Out-of-Order Events)
                if (
                  tenant.stripeSubscriptionId === subscription.id &&
                  tenant.stripeSubscriptionLastEventAt &&
                  event.created <= tenant.stripeSubscriptionLastEventAt
                ) {
                  app.log.warn(`[Stripe Webhook] Ignorando evento ${event.type} fora de ordem para o tenant ${tenant.id} (Criado em: ${event.created}, Último processado: ${tenant.stripeSubscriptionLastEventAt})`);
                  return;
                }

                await tx
                  .update(tenants)
                  .set({
                    stripeSubscriptionId: null,
                    subscriptionStatus: "canceled",
                    subscriptionPriceId: null,
                    subscriptionCurrentPeriodEnd: null,
                    cancelAtPeriodEnd: false,
                    stripeSubscriptionLastEventAt: event.created,
                    stripeBillingCachedDetails: null,
                    stripeBillingLastSyncedAt: null,
                  })
                  .where(eq(tenants.id, tenant.id));

                app.log.info(`[Stripe Webhook] Tenant ${tenant.id} assinatura deletada/cancelada.`);
              }
            });
            break;
          }

          case "invoice.created":
          case "invoice.finalized":
          case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId = invoice.customer as string;

            await db.transaction(async (tx) => {
              const [tenant] = await tx
                .select()
                .from(tenants)
                .where(eq(tenants.stripeCustomerId, customerId))
                .for("update");

              if (tenant && invoice.total > 0 && invoice.status) {
                // Upsert fatura localmente
                await tx
                  .insert(stripeInvoices)
                  .values({
                    id: invoice.id,
                    tenantId: tenant.id,
                    amount: invoice.total,
                    status: invoice.status,
                    pdfUrl: invoice.invoice_pdf || null,
                    receiptUrl: invoice.hosted_invoice_url || null,
                    createdAt: invoice.created ? new Date(invoice.created * 1000).toISOString() : new Date().toISOString(),
                  })
                  .onConflictDoUpdate({
                    target: stripeInvoices.id,
                    set: {
                      amount: invoice.total,
                      status: invoice.status,
                      pdfUrl: invoice.invoice_pdf || null,
                      receiptUrl: invoice.hosted_invoice_url || null,
                    },
                  });

                // Invalida cache de faturamento do dashboard
                await tx
                  .update(tenants)
                  .set({
                    stripeBillingCachedDetails: null,
                    stripeBillingLastSyncedAt: null,
                  })
                  .where(eq(tenants.id, tenant.id));

                app.log.info(`[Stripe Webhook] Invoice ${invoice.id} salva/atualizada localmente (Status: ${invoice.status}) para o Tenant ${tenant.id}.`);
              }
            });
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId = invoice.customer as string;

            await db.transaction(async (tx) => {
              // Buscar Tenant com bloqueio de linha FOR UPDATE
              const [tenant] = await tx
                .select()
                .from(tenants)
                .where(eq(tenants.stripeCustomerId, customerId))
                .for("update");

              if (tenant) {
                const subscriptionId = (invoice as any).subscription as string | null;
                // Proteção contra Webhooks fora de ordem (Out-of-Order Events)
                if (
                  subscriptionId &&
                  tenant.stripeSubscriptionId === subscriptionId &&
                  tenant.stripeSubscriptionLastEventAt &&
                  event.created <= tenant.stripeSubscriptionLastEventAt
                ) {
                  app.log.warn(`[Stripe Webhook] Ignorando evento ${event.type} fora de ordem para o tenant ${tenant.id} (Criado em: ${event.created}, Último processado: ${tenant.stripeSubscriptionLastEventAt})`);
                  return;
                }

                // Upsert da fatura localmente antes de falhar a conta
                if (invoice.total > 0 && invoice.status) {
                  await tx
                    .insert(stripeInvoices)
                    .values({
                      id: invoice.id,
                      tenantId: tenant.id,
                      amount: invoice.total,
                      status: invoice.status,
                      pdfUrl: invoice.invoice_pdf || null,
                      receiptUrl: invoice.hosted_invoice_url || null,
                      createdAt: invoice.created ? new Date(invoice.created * 1000).toISOString() : new Date().toISOString(),
                    })
                    .onConflictDoUpdate({
                      target: stripeInvoices.id,
                      set: {
                        amount: invoice.total,
                        status: invoice.status,
                        pdfUrl: invoice.invoice_pdf || null,
                        receiptUrl: invoice.hosted_invoice_url || null,
                      },
                    });
                }

                await tx
                  .update(tenants)
                  .set({
                    subscriptionStatus: "past_due",
                    stripeSubscriptionLastEventAt: event.created,
                    stripeBillingCachedDetails: null,
                    stripeBillingLastSyncedAt: null,
                  })
                  .where(eq(tenants.id, tenant.id));

                app.log.warn(`[Stripe Webhook] Cobrança falhou para Tenant ${tenant.id}. Status alterado para past_due.`);
              }
            });
            break;
          }

          default:
            app.log.info(`[Stripe Webhook] Evento sem handler tratado: ${event.type}`);
        }
      } catch (processErr: any) {
        app.log.error(`[Stripe Webhook] Erro ao processar evento ${event.type}: ${processErr.message}`);
        // Retornamos 500 para que o Stripe tente reenviar o webhook caso tenha sido uma falha temporária
        return reply.code(500).send({ error: "Failed to process webhook event" });
      }

      return reply.code(200).send({ received: true });
    }
  );
}
