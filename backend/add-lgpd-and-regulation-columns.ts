import { db } from "./src/infra/database/db.js";
import { sql } from "drizzle-orm";

async function addLgpdColumns() {
  try {
    // 1. Add regulation_notes column to tenants
    await db.execute(sql`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS regulation_notes TEXT;
    `);
    console.log("Column regulation_notes added to tenants table.");

    // 2. Add consent columns to consumer_profiles
    await db.execute(sql`
      ALTER TABLE consumer_profiles 
      ADD COLUMN IF NOT EXISTS consent_ip VARCHAR(45),
      ADD COLUMN IF NOT EXISTS consent_user_agent TEXT,
      ADD COLUMN IF NOT EXISTS consent_operator_id UUID;
    `);
    console.log("Consent columns added to consumer_profiles table.");

    console.log("LGPD and Regulation migration completed successfully!");
  } catch (err) {
    console.error("Error running LGPD columns migration:", err);
  }
  process.exit(0);
}

addLgpdColumns();
