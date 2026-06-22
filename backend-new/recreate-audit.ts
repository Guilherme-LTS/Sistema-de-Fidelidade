import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Droping old audit_logs...');
    await client.query(`DROP TABLE IF EXISTS audit_logs CASCADE;`);
    
    console.log('Creating new audit_logs table...');
    await client.query(`
      CREATE TABLE audit_logs (
        id SERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        operator_id UUID,
        action VARCHAR NOT NULL,
        entity_type VARCHAR,
        entity_id VARCHAR,
        metadata TEXT,
        status VARCHAR NOT NULL DEFAULT 'SUCESSO',
        ip_address VARCHAR,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_at
        ON audit_logs (tenant_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action
        ON audit_logs (action);
    `);

    console.log('Done!');
  } catch (error) {
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
