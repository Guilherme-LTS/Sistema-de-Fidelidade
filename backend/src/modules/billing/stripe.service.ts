import Stripe from "stripe";
import { env } from "../../config/env.js";
import { db } from "../../infra/database/db.js";
import { tenants, stripeInvoices } from "../../infra/database/schema.js";
import { eq, sql } from "drizzle-orm";
import { AppError } from "../../shared/errors/app-error.js";
import { planLimitService } from "./plan-limit.service.js";

class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    if (env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: "2026-06-24.dahlia" as any, // Alinhado com a versão estável de produção do Webhook
        maxNetworkRetries: 3, // Habilita retries automáticos integrados do SDK para falhas transientes de rede/429
      });
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new AppError("Stripe não está configurado neste ambiente. Defina STRIPE_SECRET_KEY.", 500);
    }
    return this.stripe;
  }

  /**
   * Obtém ou cria um cliente no Stripe para um Tenant.
   */
  async getOrCreateCustomer(tenantId: string): Promise<string> {
    const stripe = this.getStripe();

    return await db.transaction(async (tx) => {
      // 1. Obter trava de linha pessimista (Row lock) para o tenant
      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for("update");

      if (!tenant) {
        throw new AppError("Restaurante não encontrado.", 404);
      }

      // Double-check após adquirir o lock
      if (tenant.stripeCustomerId) {
        return tenant.stripeCustomerId;
      }

      // 2. Busca inteligente na Stripe para garantir unicidade histórica (caso a chave de idempotência de 24h tenha expirado)
      const existing = await stripe.customers.search({
        query: `metadata['tenantId']:'${tenantId}'`,
      });

      if (existing.data.length > 0) {
        const customerId = existing.data[0].id;
        console.log(`[Stripe] Encontrado customer existente via pesquisa de metadata: ${customerId}`);
        
        await tx
          .update(tenants)
          .set({ stripeCustomerId: customerId })
          .where(eq(tenants.id, tenantId));

        return customerId;
      }

      let testClockId: string | undefined;

      // Em ambiente de desenvolvimento, cria um Test Clock para simular viagens no tempo (Auto-Renewal)
      if (env.NODE_ENV === "development") {
        try {
          const testClock = await stripe.testHelpers.testClocks.create(
            {
              frozen_time: Math.floor(Date.now() / 1000),
              name: `TestClock - ${tenant.name}`,
            },
            {
              idempotencyKey: `create-testclock-${tenantId}`,
            }
          );
          testClockId = testClock.id;
          console.log(`[Stripe Dev] Test Clock criado: ${testClockId}`);
        } catch (err) {
          console.error("[Stripe Dev] Falha ao criar Test Clock:", err);
        }
      }

      // 3. Criar o Customer no Stripe com chave de idempotência de 24 horas
      const customer = await stripe.customers.create(
        {
          email: tenant.email || undefined,
          name: tenant.name,
          test_clock: testClockId,
          metadata: {
            tenantId: tenant.id,
          },
        },
        {
          idempotencyKey: `create-customer-${tenant.id}`,
        }
      );

      // Atualizar no banco local
      await tx
        .update(tenants)
        .set({ stripeCustomerId: customer.id })
        .where(eq(tenants.id, tenantId));

      return customer.id;
    });
  }

  /**
   * Cria uma sessão de Checkout para assinatura.
   */
  async createCheckoutSession(tenantId: string, priceId: string, tx?: any): Promise<{ url: string | null; alreadySubscribed: boolean }> {
    const stripe = this.getStripe();
    const customerId = await this.getOrCreateCustomer(tenantId);

    // Listar todas as assinaturas do cliente (de qualquer status) diretamente na Stripe
    const allSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const activeOrPendingSubs = allSubs.data.filter(
      (sub) => ["active", "trialing", "past_due", "unpaid"].includes(sub.status)
    );

    const dbClient = tx || db;
    const tenant = await dbClient.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    // Cancelar assinaturas incomplete anteriores para evitar conflitos e lixo na Stripe
    const incompleteSubs = allSubs.data.filter((sub) => sub.status === "incomplete");
    for (const sub of incompleteSubs) {
      try {
        await stripe.subscriptions.cancel(sub.id);
        console.log(`[Stripe Checkout] Cancelada assinatura incomplete antiga ${sub.id} para o tenant ${tenantId}`);
      } catch (err) {
        console.error(`[Stripe Checkout] Falha ao cancelar assinatura incomplete antiga ${sub.id}:`, err);
      }
    }

    // Se o banco local estava associado a uma das assinaturas incomplete canceladas, limpa a referência e o cache
    if (
      tenant &&
      tenant.stripeSubscriptionId &&
      incompleteSubs.some((sub) => sub.id === tenant.stripeSubscriptionId)
    ) {
      await dbClient
        .update(tenants)
        .set({
          stripeSubscriptionId: null,
          subscriptionStatus: "canceled",
          stripeSubscriptionLastEventAt: Math.floor(Date.now() / 1000),
          stripeBillingCachedDetails: null,
          stripeBillingLastSyncedAt: null,
        })
        .where(eq(tenants.id, tenantId));
    }

    if (activeOrPendingSubs.length > 0) {
      const sub = activeOrPendingSubs[0] as any;
      const subPriceId = sub.items?.data?.[0]?.price?.id;
      const currentPeriodEndUnix = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
      const periodEnd = currentPeriodEndUnix ? new Date(currentPeriodEndUnix * 1000).toISOString() : null;

      await dbClient
        .update(tenants)
        .set({
          stripeSubscriptionId: sub.id,
          subscriptionStatus: sub.status,
          subscriptionPriceId: subPriceId,
          subscriptionCurrentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          stripeBillingCachedDetails: null,
          stripeBillingLastSyncedAt: null,
        })
        .where(eq(tenants.id, tenantId));

      return { url: null, alreadySubscribed: true };
    }

    // Configuração de trial estendido caso o usuário ainda esteja no período grátis local
    let subscription_data: Stripe.Checkout.SessionCreateParams.SubscriptionData | undefined;
    
    if (tenant?.subscriptionStatus === "trialing" && tenant?.subscriptionCurrentPeriodEnd) {
      const trialEndDate = new Date(tenant.subscriptionCurrentPeriodEnd);
      const secondsUntilEnd = Math.floor((trialEndDate.getTime() - Date.now()) / 1000);
      
      // Stripe exige que o trial_end seja no mínimo 48h no futuro se fornecido
      if (secondsUntilEnd > 48 * 60 * 60) {
        subscription_data = {
          trial_end: Math.floor(trialEndDate.getTime() / 1000),
        };
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_update: {
        name: "auto",
        address: "auto",
      },
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data,
      tax_id_collection: {
        enabled: true,
      },
      success_url: `${env.FRONTEND_URL}/admin/assinatura?checkout_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/admin/assinatura?checkout_status=cancel`,
      metadata: {
        tenantId,
      },
    });

    if (!session.url) {
      throw new AppError("Erro ao gerar sessão de checkout do Stripe.", 500);
    }

    return { url: session.url, alreadySubscribed: false };
  }

  /**
   * Sincroniza uma sessão de checkout diretamente via API para garantir resposta instantânea.
   */
  async syncCheckoutSession(sessionId: string, expectedTenantId: string): Promise<boolean> {
    const stripe = this.getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (!session) {
      throw new AppError("Sessão de checkout não encontrada.", 404);
    }

    const tenantId = session.metadata?.tenantId;
    if (tenantId !== expectedTenantId) {
      throw new AppError("Sessão de checkout inválida para este restaurante.", 403);
    }

    if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
      const subscription = session.subscription as any;
      if (subscription) {
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const currentPeriodEndUnix = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end;
        const periodEnd = currentPeriodEndUnix
          ? new Date(currentPeriodEndUnix * 1000).toISOString()
          : null;

        await db
          .update(tenants)
          .set({
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionPriceId: priceId,
            subscriptionCurrentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
          })
          .where(eq(tenants.id, tenantId));

        return true;
      }
    }

    return false;
  }

  /**
   * Cria uma sessão do Customer Portal para o lojista gerenciar a assinatura.
   */
  async createPortalSession(tenantId: string): Promise<string> {
    const stripe = this.getStripe();
    const customerId = await this.getOrCreateCustomer(tenantId);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.FRONTEND_URL}/admin/assinatura`,
    });

    return session.url;
  }

  /**
   * Constrói o evento de webhook verificando a assinatura oficial.
   */
  /**
   * Obtém detalhes completos da assinatura e faturamento no Stripe para exibição nativa no painel.
   */
  async getSubscriptionDetails(tenantId: string) {
    const stripe = this.getStripe();
    
    // Fast Path: ler do cache sem locks
    const nowUnix = Math.floor(Date.now() / 1000);
    const CACHE_WINDOW_SECONDS = 120; // 2 minutos

    const tenantRead = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (
      tenantRead?.stripeBillingLastSyncedAt &&
      tenantRead.stripeBillingCachedDetails &&
      (nowUnix - tenantRead.stripeBillingLastSyncedAt) < CACHE_WINDOW_SECONDS
    ) {
      console.log(`[Stripe Cache Hit] Retornando dados de faturamento do cache (Fast Path) para o tenant ${tenantId}`);
      return tenantRead.stripeBillingCachedDetails as any;
    }

    // Slow Path (Cache Miss): Obter row-lock pessimista para coordenar JIT syncs concorrentes
    return await db.transaction(async (tx) => {
      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for("update");

      if (!tenant || !tenant.stripeCustomerId) {
        return null;
      }

      // Double-check após obter o lock (outra thread pode ter atualizado o cache nesse intervalo)
      if (
        tenant.stripeBillingLastSyncedAt &&
        tenant.stripeBillingCachedDetails &&
        (nowUnix - tenant.stripeBillingLastSyncedAt) < CACHE_WINDOW_SECONDS
      ) {
        console.log(`[Stripe Cache Hit] Retornando dados de faturamento do cache (Double-Checked Lock) para o tenant ${tenantId}`);
        return tenant.stripeBillingCachedDetails as any;
      }

      const customerId = tenant.stripeCustomerId;
 
      // 1. Listar faturas recentes e persistir localmente (auto-healing de JIT sync)
      try {
        const invoices = await stripe.invoices.list({
          customer: customerId,
          limit: 10,
        });
   
        for (const inv of invoices.data) {
          if (inv.total > 0 && inv.status) {
            await tx
              .insert(stripeInvoices)
              .values({
                id: inv.id,
                tenantId: tenantId,
                amount: inv.total,
                status: inv.status,
                pdfUrl: inv.invoice_pdf || null,
                receiptUrl: inv.hosted_invoice_url || null,
                createdAt: inv.created ? new Date(inv.created * 1000).toISOString() : new Date().toISOString(),
              })
              .onConflictDoUpdate({
                target: stripeInvoices.id,
                set: {
                  amount: inv.total,
                  status: inv.status,
                  pdfUrl: inv.invoice_pdf || null,
                  receiptUrl: inv.hosted_invoice_url || null,
                },
              });
          }
        }
      } catch (err: any) {
        // Se a Stripe retornar 404 (Resource Missing) indicando que o Customer ID de teste foi pesquisado no ambiente Live
        if (err.statusCode === 404 || err.message?.includes("No such customer") || err.code === "resource_missing") {
          console.warn(`[Stripe Auto-healing] ID do Customer (${customerId}) inexistente ou incompatível com o ambiente atual. Resetando credenciais locais para o tenant ${tenantId}.`);
          
          await tx
            .update(tenants)
            .set({
              stripeCustomerId: null,
              stripeSubscriptionId: null,
              subscriptionStatus: null,
              subscriptionPriceId: null,
              subscriptionCurrentPeriodEnd: null,
              stripeSubscriptionLastEventAt: null,
              stripeBillingCachedDetails: null,
              stripeBillingLastSyncedAt: null,
            })
            .where(eq(tenants.id, tenantId));
          
          return null; // Aborta e retorna null de faturamento indicando conta zerada limpa
        }
        
        // Repropaga outros tipos de erros
        throw err;
      }
 
      // Buscar do espelho local para retornar ao frontend
      const localInvoices = await tx
        .select()
        .from(stripeInvoices)
        .where(eq(stripeInvoices.tenantId, tenantId))
        .orderBy(sql`created_at DESC`)
        .limit(10);
 
      const invoiceHistory = localInvoices.map((inv) => ({
        id: inv.id,
        amount: inv.amount,
        status: inv.status,
        date: inv.createdAt,
        pdfUrl: inv.pdfUrl,
        receiptUrl: inv.receiptUrl,
      }));

      // 2. Tentar recuperar a próxima fatura (upcoming)
      let upcomingInvoice = null;
      try {
        const upcoming = await (stripe.invoices as any).upcoming({
          customer: customerId,
        });
        upcomingInvoice = {
          amount: upcoming.amount_due,
          dueDate: upcoming.next_payment_attempt
            ? new Date(upcoming.next_payment_attempt * 1000).toISOString()
            : null,
        };
      } catch (err) {
        // upcoming falha se não houver faturas/assinaturas futuras ativas
      }

      // 3. Tentar recuperar dados da assinatura ativa e método de pagamento
      let subscriptionInfo = null;
      let sub: any = null;
      let price: any = null;
      let pmDetails: any = null;
      let scheduledPlanChange: any = null;

      if (tenant.stripeSubscriptionId) {
        try {
          sub = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId, {
            expand: ["default_payment_method"],
          }) as any;

          let paymentMethod = sub.default_payment_method as Stripe.PaymentMethod | null | string;

          if (typeof paymentMethod === "string") {
            paymentMethod = await stripe.paymentMethods.retrieve(paymentMethod);
          }

          if (!paymentMethod) {
            // Tentar buscar do customer
            const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
            const defaultPm = customer.invoice_settings?.default_payment_method;
            if (defaultPm) {
              paymentMethod = await stripe.paymentMethods.retrieve(defaultPm as string);
            }
          }

          pmDetails = paymentMethod as Stripe.PaymentMethod | null;

          const subItem = sub.items?.data?.[0];
          price = subItem?.price;
          const planAmount = price?.unit_amount || 0;

          if (sub.schedule) {
            try {
              const scheduleId = typeof sub.schedule === 'string' ? sub.schedule : sub.schedule.id;
              const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
              if (schedule.phases.length > 1) {
                const nextPhase = schedule.phases[1];
                scheduledPlanChange = {
                  priceId: nextPhase.items[0].price as string,
                  startDate: new Date(nextPhase.start_date * 1000).toISOString(),
                };
              }
            } catch (e) {
              console.error("Erro ao buscar schedule", e);
            }
          }

          subscriptionInfo = {
            id: sub.id,
            status: sub.status,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            priceId: price?.id || null,
            planAmount,
            interval: price?.recurring?.interval || "month",
            scheduledPlanChange,
            card: pmDetails?.card
              ? {
                  brand: pmDetails.card.brand,
                  last4: pmDetails.card.last4,
                  expMonth: pmDetails.card.exp_month,
                  expYear: pmDetails.card.exp_year,
                }
              : null,
          };
        } catch (err) {
          console.error("Erro ao buscar dados de assinatura no Stripe:", err);
        }
      }

      const billingDetails = {
        upcomingInvoice,
        invoiceHistory,
        subscriptionInfo,
      };

      // JIT Sync + Cache Update
      const updatePayload: Record<string, any> = {
        stripeBillingCachedDetails: billingDetails,
        stripeBillingLastSyncedAt: nowUnix,
      };

      if (sub) {
        const stripePeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        const dbPeriodEnd = tenant.subscriptionCurrentPeriodEnd
          ? new Date(tenant.subscriptionCurrentPeriodEnd).toISOString()
          : null;

        const isExpired = sub.status === "canceled";

        if (
          tenant.subscriptionStatus !== sub.status ||
          tenant.cancelAtPeriodEnd !== (sub.cancel_at_period_end ?? false) ||
          tenant.subscriptionPriceId !== (isExpired ? null : (price?.id || null)) ||
          dbPeriodEnd !== (isExpired ? null : stripePeriodEnd) ||
          (isExpired && tenant.stripeSubscriptionId !== null) ||
          !tenant.stripeSubscriptionLastEventAt
        ) {
          updatePayload.subscriptionStatus = sub.status;
          updatePayload.subscriptionCurrentPeriodEnd = isExpired ? null : stripePeriodEnd;
          updatePayload.subscriptionPriceId = isExpired ? null : (price?.id || null);
          updatePayload.cancelAtPeriodEnd = isExpired ? false : (sub.cancel_at_period_end ?? false);
          updatePayload.stripeSubscriptionId = isExpired ? null : tenant.stripeSubscriptionId;
          updatePayload.stripeSubscriptionLastEventAt = nowUnix;
          console.log(`[JIT Sync] Divergência identificada no tenant ${tenantId}. Atualizando campos locais da assinatura...`);
        }
      }

      await tx
        .update(tenants)
        .set(updatePayload)
        .where(eq(tenants.id, tenantId));

      console.log(`[Stripe Cache Miss] Dados de faturamento salvos no cache para o tenant ${tenantId}`);

      return billingDetails;
    });
  }

  /**
   * Obtém dinamicamente os planos ativos da Stripe para popular a página de preços.
   */
  async getAvailablePlans(): Promise<{ id: string; stripePriceId: string; amount: number; interval: string }[]> {
    const stripe = this.getStripe();
    
    // Lista de IDs mapeados das variáveis de ambiente
    const priceMap = {
      pro_mensal: env.STRIPE_PRICE_PRO_MENSAL,
      pro_anual: env.STRIPE_PRICE_PRO_ANUAL,
    };

    const plans = [];
    for (const [key, priceId] of Object.entries(priceMap)) {
      if (priceId) {
        try {
          const price = await stripe.prices.retrieve(priceId);
          plans.push({
            id: key,
            stripePriceId: price.id,
            amount: price.unit_amount || 0,
            interval: price.recurring?.interval || "month",
          });
        } catch (e) {
          console.warn(`[StripeService] Preço ${priceId} (${key}) não encontrado na Stripe.`);
        }
      }
    }
    return plans;
  }

  /**
   * Altera o plano de faturamento de uma assinatura ativa diretamente via API.
   */
  async changePlan(tenantId: string, newPriceId: string, isUpgrade: boolean = false): Promise<void> {
    const stripe = this.getStripe();

    await db.transaction(async (tx) => {
      // 1. Lock pessimista na linha do tenant
      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for("update");

      if (!tenant || !tenant.stripeSubscriptionId) {
        throw new AppError("Nenhuma assinatura ativa encontrada para este restaurante.", 404);
      }

      const subscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);

      // Como agora só existe o Plano Pro com mudança de ciclo (mensal/anual), fazemos a atualização direta na Stripe.
      const updatedSub = await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        cancel_at_period_end: false,
        proration_behavior: subscription.status === "trialing" ? "none" : "create_prorations",
      }) as any;

      const priceId = updatedSub.items?.data?.[0]?.price?.id;
      const currentPeriodEndUnix = updatedSub.current_period_end ?? updatedSub.items?.data?.[0]?.current_period_end;
      const periodEnd = currentPeriodEndUnix
        ? new Date(currentPeriodEndUnix * 1000).toISOString()
        : null;

      await tx
        .update(tenants)
        .set({
          subscriptionStatus: updatedSub.status,
          subscriptionPriceId: priceId,
          subscriptionCurrentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: updatedSub.cancel_at_period_end ?? false,
          stripeSubscriptionLastEventAt: Math.floor(Date.now() / 1000),
          stripeBillingCachedDetails: null,
          stripeBillingLastSyncedAt: null,
        })
        .where(eq(tenants.id, tenantId));
    });
  }

  /**
   * Cancela a assinatura agendando o encerramento para o fim do ciclo pago atual.
   */
  async cancelSubscription(tenantId: string): Promise<void> {
    const stripe = this.getStripe();

    await db.transaction(async (tx) => {
      // 1. Lock pessimista na linha do tenant
      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for("update");

      if (!tenant || !tenant.stripeSubscriptionId) {
        throw new AppError("Nenhuma assinatura ativa encontrada para cancelamento.", 404);
      }

      const updatedSub = await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await tx
        .update(tenants)
        .set({
          subscriptionStatus: updatedSub.status,
          cancelAtPeriodEnd: updatedSub.cancel_at_period_end ?? true,
          stripeSubscriptionLastEventAt: Math.floor(Date.now() / 1000),
          stripeBillingCachedDetails: null,
          stripeBillingLastSyncedAt: null,
        })
        .where(eq(tenants.id, tenantId));
    });
  }

  /**
   * Cancela uma assinatura duplicada imediatamente com reembolso (prorated).
   * Utilizado pelo Webhook para proteção contra múltiplas assinaturas.
   */
  async cancelDuplicateSubscription(subscriptionId: string): Promise<void> {
    const stripe = this.getStripe();
    try {
      await stripe.subscriptions.cancel(subscriptionId, {
        invoice_now: true,
        prorate: true,
      });
    } catch (err) {
      console.error(`Erro ao cancelar assinatura duplicada ${subscriptionId}:`, err);
    }
  }

  /**
   * Reativa/retoma uma assinatura que estava agendada para cancelar no final do ciclo.
   */
  async resumeSubscription(tenantId: string): Promise<void> {
    const stripe = this.getStripe();

    await db.transaction(async (tx) => {
      // 1. Lock pessimista na linha do tenant
      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for("update");

      if (!tenant || !tenant.stripeSubscriptionId) {
        throw new AppError("Nenhuma assinatura ativa encontrada para reativação.", 404);
      }

      const updatedSub = await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      await tx
        .update(tenants)
        .set({
          subscriptionStatus: updatedSub.status,
          cancelAtPeriodEnd: updatedSub.cancel_at_period_end ?? false,
          stripeSubscriptionLastEventAt: Math.floor(Date.now() / 1000),
          stripeBillingCachedDetails: null,
          stripeBillingLastSyncedAt: null,
        })
        .where(eq(tenants.id, tenantId));
    });
  }

  /**
   * Cria uma sessão do Customer Portal específica para atualização do cartão de crédito.
   */
  async createCardUpdateSession(tenantId: string): Promise<string> {
    const stripe = this.getStripe();
    const customerId = await this.getOrCreateCustomer(tenantId);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      flow_data: {
        type: "payment_method_update",
      },
      return_url: `${env.FRONTEND_URL}/admin/assinatura`,
    });

    return session.url;
  }

  /**
   * Constrói o evento de webhook verificando a assinatura oficial.
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    const stripe = this.getStripe();
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new AppError("Stripe Webhook Secret não configurado.", 500);
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}

export const stripeService = new StripeService();
