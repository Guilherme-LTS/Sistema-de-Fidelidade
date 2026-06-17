require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const c = await pool.connect();
  try {
    console.log("=== SCHEMA TRANSACTIONS ===");
    const r = await c.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position
    `);
    r.rows.forEach(x => console.log(`${x.column_name}: ${x.data_type}, nullable=${x.is_nullable}`));
  } finally {
    c.release();
    await pool.end();
  }
})();
