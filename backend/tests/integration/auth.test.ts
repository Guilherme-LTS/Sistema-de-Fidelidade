/**
 * tests/integration/auth.test.ts
 *
 * Integration tests for the requireAuth and requireRole middleware chain.
 *
 * Isolation strategy:
 * - supabaseAuthGateway.getUser is mocked at the boundary: no real Supabase
 *   network calls are made. The mock maps synthetic bearer tokens to synthetic
 *   user IDs that match the rows seeded by factories.ts.
 * - Database rows are created via seedAuthTestData() using deterministic
 *   synthetic UUIDs that do NOT exist in any real production database.
 * - No dependency on auth.users (Supabase internal schema) anywhere in this file.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { app } from "../../src/app.js";
import { requireAuth } from "../../src/shared/security/require-auth.js";
import { requireRole } from "../../src/shared/security/require-role.js";
import { supabaseAuthGateway } from "../../src/infra/auth/supabase-auth.gateway.js";
import { User } from "@supabase/supabase-js";
import {
  seedAuthTestData,
  cleanAuthTestData,
  TEST_ADMIN_UID,
  TEST_OPERATOR_UID,
  TEST_INACTIVE_UID,
  TEST_TENANT_ID,
  TEST_ADMIN_TU_ID,
} from "../helpers/factories.js";

// ---------------------------------------------------------------------------
// Mock the auth gateway boundary — decouples tests from real Supabase Auth
// ---------------------------------------------------------------------------
vi.spyOn(supabaseAuthGateway, "getUser").mockImplementation(
  async (token: string) => {
    const tokenMap: Record<string, Partial<User>> = {
      "valid-admin-token":    { id: TEST_ADMIN_UID,    email: "admin@test.com" },
      "valid-operator-token": { id: TEST_OPERATOR_UID, email: "operator@test.com" },
      "inactive-user-token":  { id: TEST_INACTIVE_UID, email: "inactive@test.com" },
    };
    return (tokenMap[token] as User) ?? null;
  }
);

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe("Authentication & Authorization Integration", () => {

  beforeAll(async () => {
    // Seed synthetic test fixtures (idempotent, no dependency on auth.users)
    await seedAuthTestData();

    // Register ephemeral test-only routes on the shared Fastify instance
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
    await cleanAuthTestData();
    await app.close();
  });

  // -------------------------------------------------------------------------
  // 401 — Unauthenticated
  // -------------------------------------------------------------------------

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
        authorization: "Bearer this-token-is-not-in-the-mock",
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

  // -------------------------------------------------------------------------
  // 403 — Authenticated but not authorized
  // -------------------------------------------------------------------------

  it("should deny access with 403 if user profile is inactive", async () => {
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

  // -------------------------------------------------------------------------
  // 200 — Authenticated and authorized
  // -------------------------------------------------------------------------

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

    // Validate structure and synthetic fixture data — NOT any production data
    expect(body.user).toMatchObject({
      authUserId:   TEST_ADMIN_UID,
      tenantUserId: TEST_ADMIN_TU_ID,
      tenantId:     TEST_TENANT_ID,
      role:         "admin",
      email:        "admin@test.com",
      name:         "Test Admin",        // from factory, not production DB
      tenantName:   "Test Tenant (CI)",  // from factory, not production DB
    });
  });

  // -------------------------------------------------------------------------
  // RBAC — requireRole guard
  // -------------------------------------------------------------------------

  it("should enforce requireRole: admin can access admin route, operator cannot", async () => {
    const adminRes = await app.inject({
      method: "GET",
      url: "/test-admin-only",
      headers: { authorization: "Bearer valid-admin-token" },
    });
    expect(adminRes.statusCode).toBe(200);

    const operatorRes = await app.inject({
      method: "GET",
      url: "/test-admin-only",
      headers: { authorization: "Bearer valid-operator-token" },
    });
    expect(operatorRes.statusCode).toBe(403);
  });
});
