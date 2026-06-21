import { db } from "./src/infra/database/db.js";
import { sql } from "drizzle-orm";

async function runMigration() {
  try {
    console.log("Starting Phase 2 architecture migration...");

    // 1. Drop total_points from customers
    await db.execute(sql`ALTER TABLE customers DROP COLUMN IF EXISTS total_points;`);

    // 2. Create redemption_items table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS redemption_items (
        id SERIAL PRIMARY KEY,
        redemption_id INTEGER NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        points_deducted INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  }
  process.exit(0);
}

runMigration();
