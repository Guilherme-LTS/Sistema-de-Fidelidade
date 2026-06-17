require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
});

async function run() {
  try {
    const q = `
      SELECT t.id, t.data_transacao as data FROM transacoes t
      UNION ALL
      SELECT r.id, r.data_resgate as data FROM resgates r
      ORDER BY data DESC
      LIMIT 10 OFFSET 10
    `;
    const res = await pool.query(q);
    console.log(res.rows.length);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();