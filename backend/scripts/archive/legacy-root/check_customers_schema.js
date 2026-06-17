require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const c = await pool.connect();
  try {
    const r = await c.query(`SELECT column_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      ORDER BY ordinal_position`);
    console.log("=== ESTRUTURA TABELA CUSTOMERS ===");
    r.rows.forEach(x => console.log(`${x.column_name}: nullable=${x.is_nullable}, default=${x.column_default || 'nenhum'}`));
  } finally {
    c.release();
    await pool.end();
  }
})();
