import { db } from "./src/infra/database/db.js";
import { sql } from "drizzle-orm";

async function addColumns() {
  try {
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trading_name VARCHAR;`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone VARCHAR;`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email VARCHAR;`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_line1 VARCHAR;`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_number VARCHAR;`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_city VARCHAR;`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_state VARCHAR(2);`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;`);
    
    await db.execute(sql`ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS phone VARCHAR;`);
    
    console.log("Columns added successfully");
  } catch (err) {
    console.error("Error adding columns:", err);
  }
  process.exit(0);
}

addColumns();
