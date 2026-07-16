import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { sql, eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/infra/database/db.js";
import { tenants } from "../../src/infra/database/schema.js";
import { stripeService } from "../../src/modules/billing/stripe.service.js";

import { randomUUID } from "crypto";

let testTenantId: string;
const mockCustomerId = "cus_test_ordering_" + Math.random().toString(36).substring(2, 9);
const mockSubscriptionId = "sub_test_ordering_" + Math.random().toString(36).substring(2, 9);

// Variável para armazenar o evento retornado pelo mock do webhook
let mockEventToConstruct: any = null;

vi.spyOn(stripeService, "constructWebhookEvent").mockImplementation(() => {
  if (!mockEventToConstruct) {
    throw new Error("Mock event not configured");
  }
  return mockEventToConstruct;
});

vi.spyOn(stripeService, "cancelDuplicateSubscription").mockImplementation(async () => {});

describe("Out-of-Order Webhooks Integration", () => {
  beforeAll(async () => {
    testTenantId = randomUUID();
    
    // Criar um tenant isolado temporário para o teste
    await db.insert(tenants).values({
      id: testTenantId,
      name: "Test Tenant Ordering",
      slug: "test-tenant-ordering-" + Math.random().toString(36).substring(2, 9),
      stripeCustomerId: mockCustomerId,
      stripeSubscriptionId: mockSubscriptionId,
      subscriptionStatus: "active",
      stripeSubscriptionLastEventAt: null,
    });

    await app.ready();
  });

  afterAll(async () => {
    // Limpeza (Remover tenant temporário)
    await db.delete(tenants).where(eq(tenants.id, testTenantId));

    await app.close();
  });

  it("should process webhook when it arrives in order or as the first event", async () => {
    // 1. Configurar evento de atualização (t = 1000)
    mockEventToConstruct = {
      id: "evt_1_" + Math.random(),
      type: "customer.subscription.updated",
      created: 1000,
      data: {
        object: {
          id: mockSubscriptionId,
          customer: mockCustomerId,
          status: "past_due",
          cancel_at_period_end: false,
          items: {
            data: [{ price: { id: "price_pro" } }],
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

    // Verificar se o banco de dados foi atualizado para past_due
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, testTenantId),
    });
    expect(tenant?.subscriptionStatus).toBe("past_due");
    expect(tenant?.stripeSubscriptionLastEventAt).toBe(1000);
  });

  it("should ignore webhook with an older timestamp (out of order)", async () => {
    // 2. Configurar evento de atualização antigo (t = 900) tentando mudar status para "active"
    mockEventToConstruct = {
      id: "evt_2_" + Math.random(),
      type: "customer.subscription.updated",
      created: 900,
      data: {
        object: {
          id: mockSubscriptionId,
          customer: mockCustomerId,
          status: "active",
          cancel_at_period_end: false,
          items: {
            data: [{ price: { id: "price_pro" } }],
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

    // Verificar se o banco de dados IGNOROU e manteve past_due e timestamp 1000
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, testTenantId),
    });
    expect(tenant?.subscriptionStatus).toBe("past_due");
    expect(tenant?.stripeSubscriptionLastEventAt).toBe(1000);
  });

  it("should process webhook with a newer timestamp", async () => {
    // 3. Configurar evento de atualização mais novo (t = 1100) mudando status para "active"
    mockEventToConstruct = {
      id: "evt_3_" + Math.random(),
      type: "customer.subscription.updated",
      created: 1100,
      data: {
        object: {
          id: mockSubscriptionId,
          customer: mockCustomerId,
          status: "active",
          cancel_at_period_end: false,
          items: {
            data: [{ price: { id: "price_pro" } }],
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

    // Verificar se o banco de dados processou e atualizou para active e timestamp 1100
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, testTenantId),
    });
    expect(tenant?.subscriptionStatus).toBe("active");
    expect(tenant?.stripeSubscriptionLastEventAt).toBe(1100);
  });

  it("should process webhook when subscription ID changes (new subscription), regardless of timestamp", async () => {
    // Definir assinatura atual como cancelada no DB para simular que o usuário está contratando uma nova assinatura
    await db
      .update(tenants)
      .set({
        subscriptionStatus: "canceled",
      })
      .where(eq(tenants.id, testTenantId));

    // 4. Configurar evento de nova assinatura com timestamp antigo (t = 800)
    const newSubscriptionId = "sub_new_ordering_123";
    mockEventToConstruct = {
      id: "evt_4_" + Math.random(),
      type: "customer.subscription.created",
      created: 800,
      data: {
        object: {
          id: newSubscriptionId,
          customer: mockCustomerId,
          status: "trialing",
          cancel_at_period_end: false,
          items: {
            data: [{ price: { id: "price_pro" } }],
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

    // Verificar se o banco de dados processou porque o subscription ID mudou
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, testTenantId),
    });
    expect(tenant?.stripeSubscriptionId).toBe(newSubscriptionId);
    expect(tenant?.subscriptionStatus).toBe("trialing");
    expect(tenant?.stripeSubscriptionLastEventAt).toBe(800);
  });
});
