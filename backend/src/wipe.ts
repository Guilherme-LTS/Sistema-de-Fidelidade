import "dotenv/config";
import { db } from "./infra/database/db.js";
import { tenants } from "./infra/database/schema.js";
import { eq } from "drizzle-orm";

async function wipeStripeId() {
  const email = "guilherme.lucas.ts@gmail.com";
  
  await db.update(tenants)
    .set({ stripeCustomerId: null })
    .where(eq(tenants.email, email));
    
  console.log("Wiped stripeCustomerId for " + email);
  process.exit(0);
}

wipeStripeId();
