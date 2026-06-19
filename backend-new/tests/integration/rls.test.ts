import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "../../src/infra/database/db.js";
import { withTenantTransaction } from "../../src/infra/database/rls.js";

describe("PostgreSQL Row Level Security Isolation Integration", () => {
  const tenantA = "00000000-0000-0000-0000-aaaaaaaaaaaa";
  const tenantB = "00000000-0000-0000-0000-bbbbbbbbbbbb";
  const profileIdA = "00000000-0000-0000-0000-f1f1f1f1f1f1";
  const profileIdB = "00000000-0000-0000-0000-f2f2f2f2f2f2";
  const customerIdA = 999991;
  const customerIdB = 999992;

  beforeAll(async () => {
    // 1. Limpar possíveis resíduos de testes anteriores
    await db.execute(sql`DELETE FROM customers WHERE id IN (${customerIdA}, ${customerIdB})`);
    await db.execute(sql`DELETE FROM consumer_profiles WHERE id IN (${profileIdA}, ${profileIdB})`);
    await db.execute(sql`DELETE FROM tenants WHERE id IN (${tenantA}, ${tenantB})`);

    // 2. Inserir tenants
    await db.execute(sql`
      INSERT INTO tenants (id, name, document, is_active)
      VALUES 
        (${tenantA}, 'Tenant A', 'doc-a', true),
        (${tenantB}, 'Tenant B', 'doc-b', true)
    `);

    // 3. Inserir perfis globais em consumer_profiles
    await db.execute(sql`
      INSERT INTO consumer_profiles (id, document, name, lgpd_consent)
      VALUES 
        (${profileIdA}, '12345678901', 'Cliente A', true),
        (${profileIdB}, '98765432109', 'Cliente B', true)
    `);

    // 4. Inserir clientes vinculados ao tenant
    await db.execute(sql`
      INSERT INTO customers (id, tenant_id, consumer_profile_id, document, name, lgpd_consent)
      VALUES 
        (${customerIdA}, ${tenantA}, ${profileIdA}, '12345678901', 'Cliente Tenant A', true),
        (${customerIdB}, ${tenantB}, ${profileIdB}, '98765432109', 'Cliente Tenant B', true)
    `);
  });

  afterAll(async () => {
    // Limpar os registros criados para o teste
    await db.execute(sql`DELETE FROM customers WHERE id IN (${customerIdA}, ${customerIdB})`);
    await db.execute(sql`DELETE FROM consumer_profiles WHERE id IN (${profileIdA}, ${profileIdB})`);
    await db.execute(sql`DELETE FROM tenants WHERE id IN (${tenantA}, ${tenantB})`);
  });

  it("should return ONLY Customer A when running query inside Tenant A transaction context", async () => {
    const result = await withTenantTransaction({ tenantId: tenantA }, async (tx) => {
      const res = await tx.execute(
        sql`SELECT id, name, tenant_id FROM customers WHERE id IN (${customerIdA}, ${customerIdB})`
      );
      return res.rows;
    });

    expect(result).toHaveLength(1);
    expect(Number(result[0].id)).toBe(customerIdA);
    expect(result[0].tenant_id).toBe(tenantA);
  });

  it("should return ONLY Customer B when running query inside Tenant B transaction context", async () => {
    const result = await withTenantTransaction({ tenantId: tenantB }, async (tx) => {
      const res = await tx.execute(
        sql`SELECT id, name, tenant_id FROM customers WHERE id IN (${customerIdA}, ${customerIdB})`
      );
      return res.rows;
    });

    expect(result).toHaveLength(1);
    expect(Number(result[0].id)).toBe(customerIdB);
    expect(result[0].tenant_id).toBe(tenantB);
  });

  it("should return ZERO records when running query inside an unrelated tenant context", async () => {
    const unrelatedTenant = "00000000-0000-0000-0000-cccccccccccc";
    const result = await withTenantTransaction({ tenantId: unrelatedTenant }, async (tx) => {
      const res = await tx.execute(
        sql`SELECT id FROM customers WHERE id IN (${customerIdA}, ${customerIdB})`
      );
      return res.rows;
    });

    expect(result).toHaveLength(0);
  });
});
