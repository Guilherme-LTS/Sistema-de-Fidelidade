import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to DB");
    
    // Check if column exists
    const checkRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tenants' AND column_name='business_hours';
    `);

    if (checkRes.rows.length === 0) {
      await client.query(`ALTER TABLE tenants ADD COLUMN business_hours jsonb;`);
      console.log("Column business_hours added to tenants table.");
    } else {
      console.log("Column business_hours already exists.");
    }
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
