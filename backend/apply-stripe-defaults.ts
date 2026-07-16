import { db } from "./src/infra/database/db.js";
import { sql } from "drizzle-orm";

async function applyDefaults() {
  try {
    await db.execute(sql`
      ALTER TABLE tenants ALTER COLUMN subscription_status SET DEFAULT 'trialing';
      ALTER TABLE tenants ALTER COLUMN subscription_current_period_end SET DEFAULT (now() + interval '14 days');
    `);
    console.log("Database default values for Stripe columns applied successfully!");
  } catch (err) {
    console.error("Error applying database default values:", err);
  }
  process.exit(0);
}

applyDefaults();
