const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = new Client({
  connectionString: process.env.APP_DATABASE_URL || process.env.DATABASE_URL,
});

async function checkSchema() {
  try {
    await client.connect();
    
    // Check tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tenants', 'tenant_settings', 'configuracoes', 'restaurants');
    `);
    
    const tables = res.rows.map(r => r.table_name);
    console.log('Relevant tables found:', tables);
    
    for (const table of tables) {
      console.log(`\n--- Schema for ${table} ---`);
      const colRes = await client.query(`
        SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      console.table(colRes.rows);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkSchema();
