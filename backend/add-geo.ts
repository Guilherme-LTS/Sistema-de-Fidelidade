import { db } from "./src/infra/database/db.js";
import { sql } from "drizzle-orm";

async function addGeoColumns() {
  try {
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8);`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8);`);
    console.log("Columns added successfully");
  } catch(err) {
    console.error(err);
  }
  process.exit(0);
}

addGeoColumns();
