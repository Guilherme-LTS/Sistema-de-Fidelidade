import { db } from "./src/infra/database/db.js";
import { sql } from "drizzle-orm";

async function addStatusColumn() {
  try {
    await db.execute(sql`ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';`);
    console.log("Status column added to tenant_users successfully");
  } catch (err) {
    console.error("Error adding status column:", err);
  }
  process.exit(0);
}

addStatusColumn();
