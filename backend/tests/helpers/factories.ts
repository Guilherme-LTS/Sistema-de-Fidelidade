/**
 * tests/helpers/factories.ts
 *
 * Central fixture factory for integration tests.
 *
 * Design principles:
 * - All UIDs are SYNTHETIC — they do NOT exist in any real Supabase/production database.
 * - No dependency on auth.users (Supabase internal schema). The Drizzle schema
 *   declares `user_id` as a plain uuid column with NO .references() FK, so
 *   plain Postgres (used in CI containers) accepts any UUID value.
 * - Seed/clean helpers are self-contained: they work identically on a fresh
 *   CI Postgres container and on a developer's local Supabase database.
 */

import { sql } from "drizzle-orm";
import { db } from "../../src/infra/database/db.js";

// ---------------------------------------------------------------------------
// Synthetic UIDs — deterministic, never collide with production data
// ---------------------------------------------------------------------------

export const TEST_ADMIN_UID    = "aaaaaaaa-aaaa-4000-8000-000000000001";
export const TEST_OPERATOR_UID = "aaaaaaaa-aaaa-4000-8000-000000000002";
export const TEST_INACTIVE_UID = "aaaaaaaa-aaaa-4000-8000-000000000003";
export const TEST_TENANT_ID    = "bbbbbbbb-bbbb-4000-8000-000000000001";

// Stable IDs for the tenant_users rows so UPSERT ON CONFLICT works cleanly
export const TEST_ADMIN_TU_ID    = "cccccccc-cccc-4000-8000-000000000001";
export const TEST_OPERATOR_TU_ID = "cccccccc-cccc-4000-8000-000000000002";
export const TEST_INACTIVE_TU_ID = "cccccccc-cccc-4000-8000-000000000003";

// ---------------------------------------------------------------------------
// Auth Test Fixtures
// ---------------------------------------------------------------------------

/**
 * Seeds the minimum database rows required by the auth integration tests.
 * Safe to call multiple times (idempotent via ON CONFLICT DO UPDATE).
 */
export async function seedAuthTestData(): Promise<void> {
  // 1. Tenant
  await db.execute(sql`
    INSERT INTO tenants (id, name, is_active)
    VALUES (${TEST_TENANT_ID}::uuid, 'Test Tenant (CI)', true)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = true
  `);

  // 2. Admin user
  await db.execute(sql`
    INSERT INTO tenant_users (id, tenant_id, user_id, name, role, is_active, status)
    VALUES (
      ${TEST_ADMIN_TU_ID}::uuid,
      ${TEST_TENANT_ID}::uuid,
      ${TEST_ADMIN_UID}::uuid,
      'Test Admin',
      'admin',
      true,
      'active'
    )
    ON CONFLICT (id) DO UPDATE
      SET is_active = true,
          status    = 'active',
          role      = 'admin'
  `);

  // 3. Operator user
  await db.execute(sql`
    INSERT INTO tenant_users (id, tenant_id, user_id, name, role, is_active, status)
    VALUES (
      ${TEST_OPERATOR_TU_ID}::uuid,
      ${TEST_TENANT_ID}::uuid,
      ${TEST_OPERATOR_UID}::uuid,
      'Test Operator',
      'operador',
      true,
      'active'
    )
    ON CONFLICT (id) DO UPDATE
      SET is_active = true,
          status    = 'active',
          role      = 'operador'
  `);

  // 4. Inactive user (is_active = false, so requireAuth returns 403)
  await db.execute(sql`
    INSERT INTO tenant_users (id, tenant_id, user_id, name, role, is_active, status)
    VALUES (
      ${TEST_INACTIVE_TU_ID}::uuid,
      ${TEST_TENANT_ID}::uuid,
      ${TEST_INACTIVE_UID}::uuid,
      'Test Inactive',
      'operador',
      false,
      'active'
    )
    ON CONFLICT (id) DO UPDATE
      SET is_active = false
  `);
}

/**
 * Removes all rows created by seedAuthTestData.
 * Safe to call even if the rows were already deleted.
 */
export async function cleanAuthTestData(): Promise<void> {
  await db.execute(sql`
    DELETE FROM tenant_users
    WHERE id IN (
      ${TEST_ADMIN_TU_ID}::uuid,
      ${TEST_OPERATOR_TU_ID}::uuid,
      ${TEST_INACTIVE_TU_ID}::uuid
    )
  `);
  await db.execute(sql`
    DELETE FROM tenants WHERE id = ${TEST_TENANT_ID}::uuid
  `);
}
