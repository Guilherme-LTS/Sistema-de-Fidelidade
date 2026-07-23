/**
 * tenant-where-filter.test.ts
 *
 * ⚠️  ESTE TESTE NÃO VALIDA ROW LEVEL SECURITY (RLS) DO POSTGRESQL.
 *
 * O que ele testa de fato:
 *   - Que o filtro manual `AND tenant_id = X` nas queries SQL funciona corretamente.
 *   - Que registros de tenant A não são retornados quando filtramos por tenant B.
 *
 * Por que NÃO é um teste de RLS:
 *   - As queries usam o pool `db` (usuário `postgres`/service role), que é superusuário.
 *   - Em PostgreSQL, superusuários ignoram RLS mesmo com `FORCE ROW LEVEL SECURITY`.
 *     A flag FORCE afeta apenas o *owner* da tabela quando ele não é superusuário.
 *   - Se todas as políticas RLS fossem removidas do banco de produção, este teste
 *     continuaria passando — porque ele nunca dependeu das políticas existirem.
 *
 * Para testar RLS de verdade seria necessário:
 *   1. Criar um role sem BYPASSRLS e sem ownership das tabelas no banco de CI.
 *   2. Usar `withTenantTransaction` via `appDb` conectado com esse role.
 *   3. Executar queries SEM filtro manual de tenant_id e validar que as políticas
 *      implicitamente isolam os dados.
 *
 * O item acima está no roadmap técnico (P0) mas não foi implementado ainda.
 * Até lá, o isolamento multi-tenant depende exclusivamente do filtro `AND tenant_id = X`
 * nas queries de cada módulo — não de um controle de nível de banco.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "../../src/infra/database/db.js";

describe("Tenant WHERE Filter Isolation (manual SQL filter, NOT RLS)", () => {
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

    // 4. Inserir clientes vinculados a cada tenant
    await db.execute(sql`
      INSERT INTO customers (id, tenant_id, consumer_profile_id)
      VALUES 
        (${customerIdA}, ${tenantA}, ${profileIdA}),
        (${customerIdB}, ${tenantB}, ${profileIdB})
    `);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM customers WHERE id IN (${customerIdA}, ${customerIdB})`);
    await db.execute(sql`DELETE FROM consumer_profiles WHERE id IN (${profileIdA}, ${profileIdB})`);
    await db.execute(sql`DELETE FROM tenants WHERE id IN (${tenantA}, ${tenantB})`);
  });

  it("should return ONLY Customer A when filtering by Tenant A (AND tenant_id clause)", async () => {
    const res = await db.execute(
      sql`SELECT id, tenant_id FROM customers WHERE id IN (${customerIdA}, ${customerIdB}) AND tenant_id = ${tenantA}`
    );
    const result = res.rows;

    expect(result).toHaveLength(1);
    expect(Number(result[0].id)).toBe(customerIdA);
    expect(result[0].tenant_id).toBe(tenantA);
  });

  it("should return ONLY Customer B when filtering by Tenant B (AND tenant_id clause)", async () => {
    const res = await db.execute(
      sql`SELECT id, tenant_id FROM customers WHERE id IN (${customerIdA}, ${customerIdB}) AND tenant_id = ${tenantB}`
    );
    const result = res.rows;

    expect(result).toHaveLength(1);
    expect(Number(result[0].id)).toBe(customerIdB);
    expect(result[0].tenant_id).toBe(tenantB);
  });

  it("should return ZERO records when filtering by an unrelated tenant (AND tenant_id clause)", async () => {
    const unrelatedTenant = "00000000-0000-0000-0000-cccccccccccc";
    const res = await db.execute(
      sql`SELECT id FROM customers WHERE id IN (${customerIdA}, ${customerIdB}) AND tenant_id = ${unrelatedTenant}`
    );
    const result = res.rows;

    expect(result).toHaveLength(0);
  });
});
