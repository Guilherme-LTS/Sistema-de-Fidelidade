import { Client } from "pg";
import "dotenv/config";

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    
    // Update the tenant-rewards bucket constraints
    await client.query(`
      UPDATE storage.buckets
      SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
          file_size_limit = 2097152
      WHERE id = 'tenant-rewards';
    `);
    console.log("Bucket tenant-rewards updated successfully with file constraints.");
    
  } catch (err) {
    console.error("Error executing sql:", err);
  } finally {
    await client.end();
  }
}

run();
