import { Client } from "pg";
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  const sql = fs.readFileSync(path.join(process.cwd(), "..", "storage-rls.sql"), "utf-8");
  try {
    await client.query(sql);
    console.log("storage-rls.sql executed successfully");
  } catch (err) {
    console.error("Error executing sql", err);
  } finally {
    await client.end();
  }
}

run();
