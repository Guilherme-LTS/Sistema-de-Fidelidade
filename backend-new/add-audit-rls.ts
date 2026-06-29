import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Aplicando RLS para audit_logs...');
    
    // Enable RLS
    await client.query(`ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;`);
    
    // Drop existing policies if any
    await client.query(`DROP POLICY IF EXISTS "Audit logs select policy" ON audit_logs;`);
    await client.query(`DROP POLICY IF EXISTS "Audit logs insert policy" ON audit_logs;`);
    
    // Create new policies
    await client.query(`
      CREATE POLICY "Audit logs select policy" ON audit_logs
      FOR SELECT
      TO authenticated
      USING (
        tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
      );
    `);

    await client.query(`
      CREATE POLICY "Audit logs insert policy" ON audit_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (
        tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
      );
    `);

    console.log('RLS para audit_logs aplicado com sucesso!');
  } catch (error) {
    console.error('Erro ao aplicar RLS:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
