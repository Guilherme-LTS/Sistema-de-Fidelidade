require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync('scripts/migrations/015_fase14_consumer_profiles_rls_upsert_fix.sql', 'utf8');
    await client.query(sql);
    console.log('Migration 015 aplicada com sucesso.');
  } catch (err) {
    console.error('Erro ao aplicar migration 015:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
