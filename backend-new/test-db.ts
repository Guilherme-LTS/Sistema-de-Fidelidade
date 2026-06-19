import { pool } from "./src/infra/database/db.js";

async function run() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenant_users';
    `);
    console.log(res.rows);
  } catch (error) {
    console.error("DB Error:", error);
  }
  process.exit(0);
}

run();
