import { db } from "./src/infra/database/db.js";
import { sql } from "drizzle-orm";

async function addPointsConversionColumn() {
  try {
    console.log("Adding points_conversion_real column to tenants table...");
    await db.execute(sql`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS points_conversion_real NUMERIC(10,2) DEFAULT 1.00 NOT NULL;
    `);
    console.log("Column points_conversion_real added successfully!");
  } catch (err) {
    console.error("Error adding column:", err);
  }
  process.exit(0);
}

addPointsConversionColumn();
