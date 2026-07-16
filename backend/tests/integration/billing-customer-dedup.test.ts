import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/infra/database/db.js";
import { tenants } from "../../src/infra/database/schema.js";
import { stripeService } from "../../src/modules/billing/stripe.service.js";
import { randomUUID } from "crypto";

let testTenantId: string;

// Mock Stripe client calls
const stripeInstance = stripeService.getStripe();

let originalCustomersSearch: any;
let originalCustomersCreate: any;

const mockCustomersSearch = vi.fn();
const mockCustomersCreate = vi.fn();

describe("Stripe Customer Deduplication Integration", () => {
  beforeAll(async () => {
    // Fazer backup das implementações originais
    originalCustomersSearch = stripeInstance.customers.search;
    originalCustomersCreate = stripeInstance.customers.create;

    // Aplicar mocks temporários
    stripeInstance.customers.search = mockCustomersSearch as any;
    stripeInstance.customers.create = mockCustomersCreate as any;

    testTenantId = randomUUID();

    // Criar um tenant isolado temporário para o teste, sem customerId
    await db.insert(tenants).values({
      id: testTenantId,
      name: "Test Tenant Deduplication",
      slug: "test-tenant-dedup-" + Math.random().toString(36).substring(2, 9),
      stripeCustomerId: null,
      subscriptionStatus: "trialing",
    });

    await app.ready();
  });

  afterAll(async () => {
    // Restaurar implementações originais
    stripeInstance.customers.search = originalCustomersSearch;
    stripeInstance.customers.create = originalCustomersCreate;

    // Limpeza (Remover tenant temporário)
    await db.delete(tenants).where(eq(tenants.id, testTenantId));

    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reuse an existing customer found on Stripe search when local customer ID is missing", async () => {
    const mockStripeCustomerId = "cus_recovered_999";
    
    // Configurar o mock de search para simular que o customer já existe na Stripe
    mockCustomersSearch.mockResolvedValue({
      data: [
        {
          id: mockStripeCustomerId,
          metadata: { tenantId: testTenantId },
        },
      ],
    });

    const customerId = await stripeService.getOrCreateCustomer(testTenantId);

    expect(customerId).toBe(mockStripeCustomerId);

    // Deve ter buscado na Stripe usando o tenantId no metadata
    expect(mockCustomersSearch).toHaveBeenCalledTimes(1);
    expect(mockCustomersSearch).toHaveBeenCalledWith({
      query: `metadata['tenantId']:'${testTenantId}'`,
    });

    // Não deve ter criado nenhum novo customer na Stripe
    expect(mockCustomersCreate).not.toHaveBeenCalled();

    // Deve ter salvo o customerId recuperado no banco de dados local
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, testTenantId),
    });
    expect(tenant?.stripeCustomerId).toBe(mockStripeCustomerId);
  });

  it("should create a new customer with idempotency key if search yields no results", async () => {
    // Resetar o stripeCustomerId do banco para simular nova tentativa do zero
    await db
      .update(tenants)
      .set({ stripeCustomerId: null })
      .where(eq(tenants.id, testTenantId));

    // Configurar o mock de search para retornar vazio
    mockCustomersSearch.mockResolvedValue({ data: [] });

    // Configurar o mock de criação
    const newStripeCustomerId = "cus_newly_created_777";
    mockCustomersCreate.mockResolvedValue({
      id: newStripeCustomerId,
    });

    const customerId = await stripeService.getOrCreateCustomer(testTenantId);

    expect(customerId).toBe(newStripeCustomerId);

    // Deve ter buscado na Stripe primeiro
    expect(mockCustomersSearch).toHaveBeenCalledTimes(1);

    // Deve ter criado com o header de idempotência e metadados corretos
    expect(mockCustomersCreate).toHaveBeenCalledTimes(1);
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      {
        email: undefined,
        name: "Test Tenant Deduplication",
        test_clock: undefined,
        metadata: {
          tenantId: testTenantId,
        },
      },
      {
        idempotencyKey: `create-customer-${testTenantId}`,
      }
    );

    // Deve ter persistido o novo customerId no banco local
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, testTenantId),
    });
    expect(tenant?.stripeCustomerId).toBe(newStripeCustomerId);
  });
});
