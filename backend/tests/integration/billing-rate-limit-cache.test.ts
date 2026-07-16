import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { sql, eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/infra/database/db.js";
import { tenants } from "../../src/infra/database/schema.js";
import { stripeService } from "../../src/modules/billing/stripe.service.js";

const mockCustomerId = "cus_test_cache_123";
const mockSubscriptionId = "sub_test_cache_123";

import { randomUUID } from "crypto";

let testTenantId: string;

// Mock Stripe API calls
const stripeInstance = stripeService.getStripe();

let originalInvoicesList: any;
let originalInvoicesUpcoming: any;
let originalSubscriptionsRetrieve: any;

const mockInvoicesList = vi.fn().mockResolvedValue({
  data: [
    {
      id: "inv_1",
      total: 19900,
      status: "paid",
      created: 1000,
      invoice_pdf: "https://stripe.com/pdf",
      hosted_invoice_url: "https://stripe.com/invoice",
    },
  ],
});

const mockInvoicesUpcoming = vi.fn().mockResolvedValue({
  amount_due: 19900,
  next_payment_attempt: 2000,
});

const mockSubscriptionsRetrieve = vi.fn().mockResolvedValue({
  id: mockSubscriptionId,
  status: "active",
  cancel_at_period_end: false,
  current_period_start: 1000,
  current_period_end: 2000,
  default_payment_method: {
    id: "pm_123",
    type: "card",
    card: {
      brand: "visa",
      last4: "4242",
      exp_month: 12,
      exp_year: 2030,
    },
  },
  items: {
    data: [
      {
        price: {
          id: "price_pro_monthly",
          unit_amount: 19900,
          recurring: { interval: "month" },
        },
      },
    ],
  },
});

// Mock webhook event construction to bypass signature check
let mockEventToConstruct: any = null;
vi.spyOn(stripeService, "constructWebhookEvent").mockImplementation(() => {
  if (!mockEventToConstruct) {
    throw new Error("Mock event not configured");
  }
  return mockEventToConstruct;
});

describe("Stripe Billing Rate Limit Cache Integration", () => {
  beforeAll(async () => {
    // Fazer backup das implementações originais do Stripe
    originalInvoicesList = stripeInstance.invoices.list;
    originalInvoicesUpcoming = stripeInstance.invoices.upcoming;
    originalSubscriptionsRetrieve = stripeInstance.subscriptions.retrieve;

    // Aplicar mocks temporários
    stripeInstance.invoices.list = mockInvoicesList as any;
    stripeInstance.invoices.upcoming = mockInvoicesUpcoming as any;
    stripeInstance.subscriptions.retrieve = mockSubscriptionsRetrieve as any;

    testTenantId = randomUUID();
    
    // Criar um tenant isolado temporário para o teste
    await db.insert(tenants).values({
      id: testTenantId,
      name: "Test Tenant Cache",
      slug: "test-tenant-cache-" + Math.random().toString(36).substring(2, 9),
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
    // Restaurar implementações originais do Stripe
    stripeInstance.invoices.list = originalInvoicesList;
    stripeInstance.invoices.upcoming = originalInvoicesUpcoming;
    stripeInstance.subscriptions.retrieve = originalSubscriptionsRetrieve;

    // Limpeza (Remover tenant temporário)
    await db.delete(tenants).where(eq(tenants.id, testTenantId));

    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should perform live Stripe calls on cache miss (first load)", async () => {
    const details = await stripeService.getSubscriptionDetails(testTenantId);

    expect(details).not.toBeNull();
    expect(details?.subscriptionInfo?.id).toBe(mockSubscriptionId);
    expect(details?.invoiceHistory).toHaveLength(1);

    // Verificar se as APIs do Stripe foram chamadas
    expect(mockInvoicesList).toHaveBeenCalledTimes(1);
    expect(mockInvoicesUpcoming).toHaveBeenCalledTimes(1);
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledTimes(1);

    // Verificar se o banco de dados salvou o cache e o timestamp
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, testTenantId),
    });
    expect(tenant?.stripeBillingCachedDetails).not.toBeNull();
    expect(tenant?.stripeBillingLastSyncedAt).not.toBeNull();
  });

  it("should return cached details without calling Stripe API on cache hit (second load)", async () => {
    const details = await stripeService.getSubscriptionDetails(testTenantId);

    expect(details).not.toBeNull();
    expect(details?.subscriptionInfo?.id).toBe(mockSubscriptionId);

    // Verificar que as APIs da Stripe NÃO foram acionadas
    expect(mockInvoicesList).toHaveBeenCalledTimes(0);
    expect(mockInvoicesUpcoming).toHaveBeenCalledTimes(0);
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledTimes(0);
  });

  it("should perform live Stripe calls again once the cache window has expired", async () => {
    const nowUnix = Math.floor(Date.now() / 1000);
    // Simular cache expirado colocando o timestamp do sync 3 minutos no passado
    await db
      .update(tenants)
      .set({
        stripeBillingLastSyncedAt: nowUnix - 180,
      })
      .where(eq(tenants.id, testTenantId));

    const details = await stripeService.getSubscriptionDetails(testTenantId);
    expect(details).not.toBeNull();

    // Verificar que as APIs da Stripe foram acionadas novamente
    expect(mockInvoicesList).toHaveBeenCalledTimes(1);
    expect(mockInvoicesUpcoming).toHaveBeenCalledTimes(1);
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledTimes(1);
  });

  it("should invalidate the cache when a webhook is received", async () => {
    // 1. Garantir que o cache está ativo primeiro
    await stripeService.getSubscriptionDetails(testTenantId);
    let tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, testTenantId),
    });
    expect(tenant?.stripeBillingCachedDetails).not.toBeNull();
    expect(tenant?.stripeBillingLastSyncedAt).not.toBeNull();

    // 2. Simular o recebimento de um webhook Stripe de atualização de assinatura
    mockEventToConstruct = {
      id: "evt_cache_inval_" + Math.random(),
      type: "customer.subscription.updated",
      created: Math.floor(Date.now() / 1000) + 1000, // Maior que os timestamps anteriores
      data: {
        object: {
          id: mockSubscriptionId,
          customer: mockCustomerId,
          status: "active",
          cancel_at_period_end: false,
          items: {
            data: [{ price: { id: "price_pro_monthly" } }],
          },
        },
      },
    };

    const res = await app.inject({
      method: "POST",
      url: "/billing/webhook",
      headers: {
        "stripe-signature": "test-sig",
        "content-type": "application/json",
      },
      payload: "{}",
    });

    expect(res.statusCode).toBe(200);

    // 3. Verificar que o cache no banco de dados foi definido como null (invalidado)
    tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, testTenantId),
    });
    expect(tenant?.stripeBillingCachedDetails).toBeNull();
    expect(tenant?.stripeBillingLastSyncedAt).toBeNull();
  });
});
