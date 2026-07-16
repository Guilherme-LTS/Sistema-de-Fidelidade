import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/infra/database/db.js";
import { tenants, stripeInvoices, stripeWebhookEvents } from "../../src/infra/database/schema.js";
import { stripeService } from "../../src/modules/billing/stripe.service.js";
import { randomUUID } from "crypto";

const mockCustomerId = "cus_invoice_999";
const mockSubscriptionId = "sub_invoice_999";
let testTenantId: string;

const stripeInstance = stripeService.getStripe();

let originalInvoicesList: any;
let originalSubscriptionsRetrieve: any;
let originalCustomersRetrieve: any;

const mockInvoicesList = vi.fn().mockResolvedValue({
  data: [
    {
      id: "in_mock_123",
      total: 19900,
      status: "paid",
      created: 1000,
      invoice_pdf: "https://stripe.com/pdf/in_mock_123",
      hosted_invoice_url: "https://stripe.com/invoice/in_mock_123",
    },
  ],
});

const mockSubscriptionsRetrieve = vi.fn().mockResolvedValue({
  id: mockSubscriptionId,
  status: "active",
  cancel_at_period_end: false,
  current_period_start: 1000,
  current_period_end: 2000,
  items: {
    data: [{ price: { id: "price_pro_mensal" } }],
  },
});

const mockCustomersRetrieve = vi.fn().mockResolvedValue({
  id: mockCustomerId,
  invoice_settings: { default_payment_method: null },
});

let mockEventToConstruct: any = null;
vi.spyOn(stripeService, "constructWebhookEvent").mockImplementation(() => {
  if (!mockEventToConstruct) {
    throw new Error("Mock event not configured");
  }
  return mockEventToConstruct;
});

describe("Stripe Local Invoices Database Replication Integration", () => {
  beforeAll(async () => {
    originalInvoicesList = stripeInstance.invoices.list;
    originalSubscriptionsRetrieve = stripeInstance.subscriptions.retrieve;
    originalCustomersRetrieve = stripeInstance.customers.retrieve;

    stripeInstance.invoices.list = mockInvoicesList as any;
    stripeInstance.subscriptions.retrieve = mockSubscriptionsRetrieve as any;
    stripeInstance.customers.retrieve = mockCustomersRetrieve as any;

    testTenantId = randomUUID();

    // Criar tenant
    await db.insert(tenants).values({
      id: testTenantId,
      name: "Invoices Tenant Test",
      slug: "invoices-tenant-test-" + Math.random().toString(36).substring(2, 9),
      stripeCustomerId: mockCustomerId,
      stripeSubscriptionId: mockSubscriptionId,
      subscriptionStatus: "active",
    });

    await app.ready();
  });

  afterAll(async () => {
    stripeInstance.invoices.list = originalInvoicesList;
    stripeInstance.subscriptions.retrieve = originalSubscriptionsRetrieve;
    stripeInstance.customers.retrieve = originalCustomersRetrieve;

    // Limpar faturas locais e tenant
    await db.delete(stripeInvoices).where(eq(stripeInvoices.tenantId, testTenantId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));

    await app.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete(stripeInvoices).where(eq(stripeInvoices.tenantId, testTenantId));
    await db.delete(stripeWebhookEvents).where(eq(stripeWebhookEvents.id, "evt_invoice_paid_123"));
  });

  it("should replicate invoices to local database on JIT cache miss", async () => {
    // 1. Chamar getSubscriptionDetails para forçar o JIT cache miss
    const details = await stripeService.getSubscriptionDetails(testTenantId);

    expect(details?.invoiceHistory).toHaveLength(1);
    expect(details?.invoiceHistory[0].id).toBe("in_mock_123");

    // 2. Verificar se foi gravado na tabela stripe_invoices
    const localInv = await db.query.stripeInvoices.findFirst({
      where: eq(stripeInvoices.tenantId, testTenantId),
    });

    expect(localInv).toBeDefined();
    expect(localInv?.id).toBe("in_mock_123");
    expect(localInv?.amount).toBe(19900);
    expect(localInv?.status).toBe("paid");
    expect(localInv?.pdfUrl).toBe("https://stripe.com/pdf/in_mock_123");
  });

  it("should upsert local invoices on invoice.paid webhook and clear the cache", async () => {
    // Definir cache local para o tenant para validar invalidação
    await db
      .update(tenants)
      .set({
        stripeBillingCachedDetails: { some: "cache" },
        stripeBillingLastSyncedAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(tenants.id, testTenantId));

    mockEventToConstruct = {
      id: "evt_invoice_paid_123",
      type: "invoice.paid",
      created: 3000,
      data: {
        object: {
          id: "in_mock_456",
          customer: mockCustomerId,
          total: 29900,
          status: "paid",
          invoice_pdf: "https://stripe.com/pdf/in_mock_456",
          hosted_invoice_url: "https://stripe.com/invoice/in_mock_456",
          created: 1500,
        },
      },
    };

    const response = await app.inject({
      method: "POST",
      url: "/billing/webhook",
      headers: {
        "stripe-signature": "test-sig",
        "content-type": "application/json",
      },
      payload: "{}",
    });

    expect(response.statusCode).toBe(200);

    // Verificar se a nova fatura foi persistida localmente
    const localInv = await db.query.stripeInvoices.findFirst({
      where: eq(stripeInvoices.id, "in_mock_456"),
    });

    expect(localInv).toBeDefined();
    expect(localInv?.tenantId).toBe(testTenantId);
    expect(localInv?.amount).toBe(29900);
    expect(localInv?.status).toBe("paid");

    // Verificar se o cache de faturamento foi invalidado no banco
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, testTenantId),
    });
    expect(tenant?.stripeBillingCachedDetails).toBeNull();
    expect(tenant?.stripeBillingLastSyncedAt).toBeNull();
  });
});
