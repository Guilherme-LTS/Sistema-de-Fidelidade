const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getTables() {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  for (let t of tables.rows) {
    console.log('\\n--- Table:', t.table_name);
    const cols = await pool.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [t.table_name]);
    console.table(cols.rows);
  }
  const fkeys = await pool.query(`SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'`);
  console.log('\\n--- Foreign Keys ---');
  console.table(fkeys.rows);
  const pkeys = await pool.query(`SELECT kcu.table_name, kcu.column_name FROM information_schema.table_constraints t JOIN information_schema.key_column_usage kcu ON t.constraint_catalog = kcu.constraint_catalog AND t.constraint_schema = kcu.constraint_schema AND t.constraint_name = kcu.constraint_name WHERE t.constraint_type = 'PRIMARY KEY' AND t.table_schema='public'`);
  console.log('\\n--- Primary Keys ---');
  console.table(pkeys.rows);
  await pool.end();
}
getTables().catch(console.error);