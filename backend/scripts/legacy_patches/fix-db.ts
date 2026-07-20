import { Client } from "pg";
import "dotenv/config";

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    
    // Add image_url to rewards if it doesn't exist
    await client.query(`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS image_url text;`);
    console.log("Column image_url added to rewards table successfully.");
    
    // Check if it's there
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='rewards' AND column_name='image_url';
    `);
    console.log("Verified column in DB:", res.rows);
  } catch (err) {
    console.error("Error executing migration sql:", err);
  } finally {
    await client.end();
  }
}

run();
