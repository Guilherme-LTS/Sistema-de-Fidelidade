import { db } from "./src/infra/database/db.js";
import { sql } from "drizzle-orm";

async function addStripeColumns() {
  try {
    // 1. Add subscription columns to tenants
    await db.execute(sql`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50),
      ADD COLUMN IF NOT EXISTS subscription_price_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;
    `);
    console.log("Stripe subscription columns added to tenants table.");

    // 2. Create stripe_webhook_events table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stripe_webhook_events (
        id VARCHAR(255) PRIMARY KEY,
        processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);
    console.log("stripe_webhook_events table created.");

    console.log("Stripe database migration completed successfully!");
  } catch (err) {
    console.error("Error running Stripe columns migration:", err);
  }
  process.exit(0);
}

addStripeColumns();
