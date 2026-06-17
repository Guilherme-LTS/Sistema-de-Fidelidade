require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const client = await pool.connect();
  try {
    console.log("=== CLIENTES NO BANCO ===");
    const result = await client.query('SELECT id, name, document, tenant_id FROM customers ORDER BY created_at DESC LIMIT 10');
    console.log("Total de registros:", result.rows.length);
    result.rows.forEach(r => {
      console.log(`- ${r.name} (${r.document}), tenant_id: ${r.tenant_id}`);
    });
  } catch (err) {
    console.error("Erro:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
