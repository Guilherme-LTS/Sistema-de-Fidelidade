import { db } from "./src/infra/database/db.js";
import { rewards } from "./src/infra/database/schema.js";
import { eq, and } from "drizzle-orm";

async function run() {
  try {
    const [recompensa] = await db.update(rewards)
      .set({ isActive: false })
      .where(eq(rewards.id, NaN))
      .returning();
    console.log("Success");
  } catch (err) {
    console.error("FATAL:", err);
  }
  process.exit(0);
}

run();
