import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Droping old audit_logs...');
    await client.query(`DROP TABLE IF EXISTS audit_logs CASCADE;`);
    console.log('Done!');
  } catch (error) {
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
