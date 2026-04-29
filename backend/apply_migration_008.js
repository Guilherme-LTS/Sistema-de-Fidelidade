require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const client = await pool.connect();
  try {
    console.log("📋 Aplicando Migration 008: Critical Indexes...");
    const sql = fs.readFileSync('scripts/migrations/008_fase7_critical_indexes.sql', 'utf8');
    
    const result = await client.query(sql);
    console.log("✅ MIGRATION_APPLIED - All indexes created successfully");
    
    // Verify indexes
    console.log("\n📊 Índices criados:");
    const verify = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename IN ('rewards', 'transactions', 'redemptions', 'customers', 'tenant_users')
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);
    
    verify.rows.forEach(row => {
      console.log(`  - ${row.indexname} (tabela: ${row.tablename})`);
    });
    
    console.log(`\nTotal de novos índices: ${verify.rows.length}`);
  } catch (err) {
    console.error("❌ ERRO ao aplicar migration:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
