import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/infra/database/db.js";
import { tenants } from "../../src/infra/database/schema.js";
import { stripeService } from "../../src/modules/billing/stripe.service.js";
import { randomUUID } from "crypto";

const mockCustomerId = "cus_concurrent_999";
const mockSubscriptionId = "sub_concurrent_999";
let testTenantId: string;

// Mock Stripe API calls
const stripeInstance = stripeService.getStripe();

let originalSubscriptionsRetrieve: any;
let originalSubscriptionsUpdate: any;

const mockSubscriptionsRetrieve = vi.fn().mockResolvedValue({
  id: mockSubscriptionId,
  status: "active",
  cancel_at_period_end: false,
  current_period_start: 1000,
  current_period_end: 2000,
  default_payment_method: {
    id: "pm_123",
    type: "card",
    card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 },
  },
  items: {
    data: [
      {
        id: "si_123",
        price: {
          id: "price_pro_mensal",
          unit_amount: 19900,
          recurring: { interval: "month" },
        },
      },
    ],
  },
});

const mockSubscriptionsUpdate = vi.fn().mockResolvedValue({
  id: mockSubscriptionId,
  status: "active",
  cancel_at_period_end: false,
  current_period_end: 2500,
  items: {
    data: [
      {
        id: "si_123",
        price: {
          id: "price_pro_anual",
          unit_amount: 199000,
          recurring: { interval: "year" },
        },
      },
    ],
  },
});

let mockEventToConstruct: any = null;
vi.spyOn(stripeService, "constructWebhookEvent").mockImplementation(() => {
  if (!mockEventToConstruct) {
    throw new Error("Mock event not configured");
  }
  return mockEventToConstruct;
});

describe("Stripe Billing Concurrency & Transaction Isolation Integration", () => {
  beforeAll(async () => {
    // Fazer backup das implementações
    originalSubscriptionsRetrieve = stripeInstance.subscriptions.retrieve;
    originalSubscriptionsUpdate = stripeInstance.subscriptions.update;

    // Aplicar mocks temporários
    stripeInstance.subscriptions.retrieve = mockSubscriptionsRetrieve as any;
    stripeInstance.subscriptions.update = mockSubscriptionsUpdate as any;

    testTenantId = randomUUID();

    // Criar tenant isolado para o teste
    await db.insert(tenants).values({
      id: testTenantId,
      name: "Concurrent Tenant Test",
      slug: "concurrent-tenant-test-" + Math.random().toString(36).substring(2, 9),
      stripeCustomerId: mockCustomerId,
      stripeSubscriptionId: mockSubscriptionId,
      subscriptionStatus: "active",
      stripeSubscriptionLastEventAt: null,
      stripeBillingCachedDetails: null,
      stripeBillingLastSyncedAt: null,
    });

    await app.ready();
  });

  afterAll(async () => {
    // Restaurar implementações originais
    stripeInstance.subscriptions.retrieve = originalSubscriptionsRetrieve;
    stripeInstance.subscriptions.update = originalSubscriptionsUpdate;

    // Limpeza (Remover tenant temporário)
    await db.delete(tenants).where(eq(tenants.id, testTenantId));

    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle concurrent webhook and user mutation requests on the same tenant without errors or deadlocks", async () => {
    // 1. Simular o recebimento concorrente de um webhook (mudando status para past_due)
    // E uma ação manual do lojista (mudando plano para pro_anual)
    
    mockEventToConstruct = {
      id: "evt_concurrency_" + Math.random(),
      type: "customer.subscription.updated",
      created: 3000,
      data: {
        object: {
          id: mockSubscriptionId,
          customer: mockCustomerId,
          status: "past_due",
          cancel_at_period_end: false,
          items: {
            data: [
              {
                price: { id: "price_pro_mensal" },
              },
            ],
          },
        },
      },
    };

    // Acionar em paralelo:
    // A. Webhook POST
    // B. Mutação local changePlan
    const webhookPromise = app.inject({
      method: "POST",
      url: "/billing/webhook",
      headers: {
        "stripe-signature": "test-sig",
        "content-type": "application/json",
      },
      payload: "{}",
    });

    const mutationPromise = stripeService.changePlan(testTenantId, "price_pro_anual");

    // Esperar ambos concluírem concorrentemente
    const [webhookResult] = await Promise.all([webhookPromise, mutationPromise]);

    expect(webhookResult.statusCode).toBe(200);

    // Verificar se o banco de dados está consistente e sem travamentos perpétuos (deadlocks)
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, testTenantId),
    });

    expect(tenant).not.toBeNull();
    // O cache deve ser limpo/inválido para forçar refresh na UI
    expect(tenant?.stripeBillingCachedDetails).toBeNull();
    expect(tenant?.stripeBillingLastSyncedAt).toBeNull();

    // Ambos devem ter executado e as transações foram serializadas com sucesso no banco de dados.
    expect(mockSubscriptionsUpdate).toHaveBeenCalledTimes(1);
  });
});
