/**
 * tests/helpers/global-setup.ts
 *
 * Vitest global setup file — runs ONCE before all test suites in a separate
 * Node.js process (not a Vitest worker). Uses only plain pg and Node.js APIs.
 *
 * Responsibility: Ensure the local developer Supabase database does not have
 * the Supabase-internal FK "funcionarios_user_id_fkey" (or any FK on
 * tenant_users.user_id referencing auth.users) before tests run.
 *
 * WHY:
 * Supabase creates a FOREIGN KEY from tenant_users.user_id → auth.users.id
 * at the database level. This constraint does NOT appear in Drizzle migrations
 * (it was created outside Drizzle, directly in Supabase). In the CI Postgres
 * container (built via drizzle-kit push), this FK does NOT exist. This creates
 * a fatal asymmetry: tests that INSERT synthetic UIDs into tenant_users pass in
 * CI but fail locally with "not present in table users".
 *
 * We use pg_constraint (not information_schema) because Supabase's connection
 * pooler does not expose cross-schema rows in information_schema views.
 *
 * This DROP is idempotent: on CI the constraint does not exist, so it is a no-op.
 */

import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadDatabaseUrl(): string {
  // globalSetup runs in a separate process, so we parse .env files manually.
  // Priority: process.env → .env → .env.test
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  for (const file of [".env", ".env.test"]) {
    const filePath = resolve(process.cwd(), file);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      if (key !== "DATABASE_URL") continue;
      return trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    }
  }

  return "postgresql://postgres:postgres@localhost:5432/test_db";
}

export async function setup() {
  const connectionString = loadDatabaseUrl();
  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
  } catch {
    // Cannot connect — CI or environment without local DB.
    // drizzle-kit push in CI will create a clean schema without this FK anyway.
    return;
  }

  try {
    // Find FK constraints on tenant_users.user_id that reference auth.users.
    // pg_constraint is used instead of information_schema because Supabase's
    // connection pooler blocks cross-schema visibility in information_schema.
    const { rows } = await client.query<{ constraint_name: string }>(`
      SELECT con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_class tbl   ON tbl.oid  = con.conrelid
      JOIN pg_namespace tnsp ON tnsp.oid = tbl.relnamespace
      JOIN pg_class fk_tbl  ON fk_tbl.oid = con.confrelid
      JOIN pg_namespace fnsp ON fnsp.oid  = fk_tbl.relnamespace
      JOIN pg_attribute att  ON att.attrelid = con.conrelid
        AND att.attnum = ANY(con.conkey)
      WHERE con.contype  = 'f'
        AND tnsp.nspname = 'public'
        AND tbl.relname  = 'tenant_users'
        AND att.attname  = 'user_id'
        AND fnsp.nspname = 'auth'
    `);

    for (const row of rows) {
      await client.query(
        `ALTER TABLE public.tenant_users DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`
      );
      console.log(
        `[global-setup] Dropped Supabase-internal auth.users FK: ${row.constraint_name}`
      );
    }
  } finally {
    await client.end();
  }
}

export async function teardown() {
  // Nothing to tear down globally
}
