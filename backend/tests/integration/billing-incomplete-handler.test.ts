import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/infra/database/db.js";
import { tenants } from "../../src/infra/database/schema.js";
import { stripeService } from "../../src/modules/billing/stripe.service.js";
import { randomUUID } from "crypto";

const mockCustomerId = "cus_test_incomplete_123";
const mockIncompleteSubId = "sub_incomplete_123";
let testTenantId: string;

// Mock Stripe client calls
const stripeInstance = stripeService.getStripe();

let originalSubscriptionsList: any;
let originalSubscriptionsCancel: any;
let originalCheckoutSessionsCreate: any;

const mockSubscriptionsList = vi.fn().mockResolvedValue({
  data: [
    {
      id: mockIncompleteSubId,
      status: "incomplete",
      customer: mockCustomerId,
    },
  ],
});

const mockSubscriptionsCancel = vi.fn().mockResolvedValue({
  id: mockIncompleteSubId,
  status: "canceled",
});

const mockCheckoutSessionsCreate = vi.fn().mockResolvedValue({
  id: "cs_test_999",
  url: "https://checkout.stripe.com/pay/cs_test_999",
});

describe("Stripe Incomplete Subscription Handling Integration", () => {
  beforeAll(async () => {
    // Fazer backup das implementações originais do Stripe
    originalSubscriptionsList = stripeInstance.subscriptions.list;
    originalSubscriptionsCancel = stripeInstance.subscriptions.cancel;
    originalCheckoutSessionsCreate = stripeInstance.checkout.sessions.create;

    // Aplicar mocks temporários
    stripeInstance.subscriptions.list = mockSubscriptionsList as any;
    stripeInstance.subscriptions.cancel = mockSubscriptionsCancel as any;
    stripeInstance.checkout.sessions.create = mockCheckoutSessionsCreate as any;

    testTenantId = randomUUID();

    // Criar um tenant isolado temporário para o teste, associado à assinatura incomplete
    await db.insert(tenants).values({
      id: testTenantId,
      name: "Test Tenant Incomplete",
      slug: "test-tenant-incomplete-" + Math.random().toString(36).substring(2, 9),
      stripeCustomerId: mockCustomerId,
      stripeSubscriptionId: mockIncompleteSubId,
      subscriptionStatus: "incomplete",
      stripeSubscriptionLastEventAt: null,
      stripeBillingCachedDetails: { dummy: true },
      stripeBillingLastSyncedAt: 12345,
    });

    await app.ready();
  });

  afterAll(async () => {
    // Restaurar implementações originais do Stripe
    stripeInstance.subscriptions.list = originalSubscriptionsList;
    stripeInstance.subscriptions.cancel = originalSubscriptionsCancel;
    stripeInstance.checkout.sessions.create = originalCheckoutSessionsCreate;

    // Limpeza (Remover tenant temporário)
    await db.delete(tenants).where(eq(tenants.id, testTenantId));

    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should proactively cancel incomplete subscriptions and allow new checkout session creation", async () => {
    const result = await stripeService.createCheckoutSession(testTenantId, "price_pro_mensal");

    expect(result).not.toBeNull();
    expect(result.alreadySubscribed).toBe(false);
    expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_999");

    // Verificar se a API da Stripe listou as assinaturas
    expect(mockSubscriptionsList).toHaveBeenCalledTimes(1);

    // Verificar se a API de cancelamento foi chamada para expirar a assinatura incomplete
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith(mockIncompleteSubId);
    expect(mockSubscriptionsCancel).toHaveBeenCalledTimes(1);

    // Verificar se a nova sessão de checkout foi de fato gerada
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledTimes(1);

    // Verificar se o banco de dados limpou a referência da assinatura antiga e o cache
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, testTenantId),
    });
    expect(tenant?.stripeSubscriptionId).toBeNull();
    expect(tenant?.subscriptionStatus).toBe("canceled");
    expect(tenant?.stripeBillingCachedDetails).toBeNull();
    expect(tenant?.stripeBillingLastSyncedAt).toBeNull();
  });
});
