import pg from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function run() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Use pg_constraint (not information_schema) because Supabase's connection
    // pooler blocks cross-schema visibility in information_schema views.
    const res = await client.query<{
      constraint_name: string;
      foreign_schema: string | null;
    }>(`
      SELECT
        con.conname AS constraint_name,
        nsp.nspname AS foreign_schema
      FROM pg_constraint con
      JOIN pg_class tbl ON tbl.oid = con.conrelid
      JOIN pg_namespace tnsp ON tnsp.oid = tbl.relnamespace
      LEFT JOIN pg_class cls ON cls.oid = con.confrelid
      LEFT JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
      WHERE con.contype = 'f'
        AND tnsp.nspname = 'public'
        AND tbl.relname = 'tenant_users'
        AND nsp.nspname = 'auth'
    `);

    if (res.rows.length === 0) {
      console.log('[drop-auth-fk] No auth.users FK found — schema is already clean.');
      return;
    }

    for (const row of res.rows) {
      await client.query(
        `ALTER TABLE public.tenant_users DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`
      );
      console.log(`[drop-auth-fk] Dropped: ${row.constraint_name}`);
    }
  } finally {
    await client.end();
  }
}

run().catch(console.error);
