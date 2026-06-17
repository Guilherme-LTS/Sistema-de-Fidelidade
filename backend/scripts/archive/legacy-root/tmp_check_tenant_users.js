require('dotenv').config();
const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: process.env.APP_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    const policies = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname='public' AND tablename='tenant_users'
      ORDER BY policyname
    `);
    console.log('=== tenant_users policies ===');
    console.table(policies.rows);

    const sample = await client.query(`SELECT id, user_id, name, role, tenant_id FROM tenant_users LIMIT 5`);
    console.log('=== tenant_users sample ===');
    console.table(sample.rows);
  } finally {
    client.release();
    await pool.end();
  }
})().catch(err => { console.error(err); process.exit(1); });
