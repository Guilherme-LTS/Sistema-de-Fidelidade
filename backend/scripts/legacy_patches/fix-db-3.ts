import { Client } from "pg";
import "dotenv/config";

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    
    // Drop the broad SELECT policy from public
    await client.query(`DROP POLICY IF EXISTS "Permitir leitura de rewards" ON storage.objects;`);
    console.log("Policy dropped successfully.");
    
  } catch (err) {
    console.error("Error executing sql:", err);
  } finally {
    await client.end();
  }
}

run();
