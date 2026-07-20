import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";
import { app } from "../../src/app.js";
import { requireAuth } from "../../src/shared/security/require-auth.js";
import { requireRole } from "../../src/shared/security/require-role.js";
import { supabaseAuthGateway } from "../../src/infra/auth/supabase-auth.gateway.js";
import { User } from "@supabase/supabase-js";
import { db } from "../../src/infra/database/db.js";

// Usamos as chaves de usuários reais existentes no banco de dados para evitar violações de FK com auth.users
const realAdminUid = "4173d533-32f8-4914-84b3-425c3486a8b5";     // Restaurante A (Admin)
const realOperatorUid = "64cf7e17-2584-49f3-b43e-c3928df98e57";  // Operador A (Operador)
const realInactiveUid = "1f6a9bbd-7f23-49f7-99f1-5f23cf58a8e4";  // Operador B (Será desativado temporariamente)

// Mock do Supabase Auth Gateway para simular decodificação de JWTs
vi.spyOn(supabaseAuthGateway, "getUser").mockImplementation(async (token: string) => {
  if (token === "valid-admin-token") {
    return { id: realAdminUid, email: "admin@test.com" } as unknown as User;
  }
  if (token === "valid-operator-token") {
    return { id: realOperatorUid, email: "operator@test.com" } as unknown as User;
  }
  if (token === "inactive-user-token") {
    return { id: realInactiveUid, email: "inactive@test.com" } as unknown as User;
  }
  return null;
});

describe("Authentication & Authorization Integration", () => {
  const testTenantId = "4173d533-32f8-4914-84b3-425c3486a8b5";

  beforeAll(async () => {
    // 1. Inserir UIDs no auth.users (se a permissão do banco permitir)
    try {
      await db.execute(sql`
        INSERT INTO auth.users (id, email)
        VALUES 
          (${realAdminUid}::uuid, 'admin@test.com'),
          (${realOperatorUid}::uuid, 'operator@test.com'),
          (${realInactiveUid}::uuid, 'inactive@test.com')
        ON CONFLICT (id) DO NOTHING;
      `);
    } catch {
      // Tabela auth.users é gerenciada pelo Supabase Auth em nuvem; ignora se permissão for negada
    }

    // 3. Garantir que o tenant de teste exista e esteja ativo (autocontido para CI e Dev)
    await db.execute(sql`
      INSERT INTO tenants (id, name, is_active)
      VALUES (${testTenantId}::uuid, 'Test Tenant Admin', true)
      ON CONFLICT (id) DO UPDATE SET is_active = true
    `);

    // 4. Garantir que o usuário admin de teste exista e esteja ativo
    await db.execute(sql`
      INSERT INTO tenant_users (id, tenant_id, user_id, name, role, is_active, status)
      VALUES (
        '26b5a3e4-29c9-4178-9dd0-ab39e6cb842d'::uuid,
        ${testTenantId}::uuid,
        ${realAdminUid}::uuid,
        'Admin User',
        'admin',
        true,
        'active'
      )
      ON CONFLICT (id) DO UPDATE SET is_active = true, status = 'active', role = 'admin'
    `);

    // 5. Garantir que o usuário operador de teste exista e esteja ativo
    await db.execute(sql`
      INSERT INTO tenant_users (id, tenant_id, user_id, name, role, is_active, status)
      VALUES (
        '64cf7e17-2584-49f3-b43e-c3928df98e57'::uuid,
        ${testTenantId}::uuid,
        ${realOperatorUid}::uuid,
        'Operator User',
        'operador',
        true,
        'active'
      )
      ON CONFLICT (id) DO UPDATE SET is_active = true, status = 'active', role = 'operador'
    `);

    // 6. Garantir que o usuário inativo de teste exista e esteja desativado
    await db.execute(sql`
      INSERT INTO tenant_users (id, tenant_id, user_id, name, role, is_active, status)
      VALUES (
        '1f6a9bbd-7f23-49f7-99f1-5f23cf58a8e4'::uuid,
        ${testTenantId}::uuid,
        ${realInactiveUid}::uuid,
        'Inactive User',
        'operador',
        false,
        'active'
      )
      ON CONFLICT (id) DO UPDATE SET is_active = false
    `);

    // 3. Registrar rotas de teste protegidas no Fastify
    app.get("/test-protected", { preHandler: [requireAuth] }, async (request) => {
      return { user: request.user };
    });

    app.get("/test-admin-only", { preHandler: [requireAuth, requireRole(["admin"])] }, async () => {
      return { ok: true };
    });

    app.get("/test-operator-only", { preHandler: [requireAuth, requireRole(["operador"])] }, async () => {
      return { ok: true };
    });

    await app.ready();
  });

  afterAll(async () => {
    // Reverter o estado do Operador B para ativo para não quebrar o banco de desenvolvimento do usuário
    await db.execute(sql`
      UPDATE tenant_users 
      SET is_active = true 
      WHERE user_id = ${realInactiveUid}
    `);
    await app.close();
  });

  it("should deny access with 401 if Authorization header is missing", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test-protected",
    });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Token de acesso não fornecido ou inválido.",
      },
    });
  });

  it("should deny access with 401 if token is invalid or expired", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test-protected",
      headers: {
        authorization: "Bearer invalid-token",
      },
    });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Token inválido ou expirado.",
      },
    });
  });

  it("should deny access with 403 if user profile is inactive or pending", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test-protected",
      headers: {
        authorization: "Bearer inactive-user-token",
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("should allow access and populate request.user for valid admin token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test-protected",
      headers: {
        authorization: "Bearer valid-admin-token",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.user).toMatchObject({
      authUserId: realAdminUid,
      tenantUserId: "26b5a3e4-29c9-4178-9dd0-ab39e6cb842d",
      tenantId: testTenantId,
      role: "admin",
      email: "admin@test.com",
      name: "Gui Rest 9",
      phone: "92984168887",
      tenantName: "Gui Nome 9",
    });
  });

  it("should allow role-specific access based on requireRole guard rules", async () => {
    const adminRes = await app.inject({
      method: "GET",
      url: "/test-admin-only",
      headers: {
        authorization: "Bearer valid-admin-token",
      },
    });
    expect(adminRes.statusCode).toBe(200);

    const operatorRes = await app.inject({
      method: "GET",
      url: "/test-admin-only",
      headers: {
        authorization: "Bearer valid-operator-token",
      },
    });
    expect(operatorRes.statusCode).toBe(403);
  });
});
