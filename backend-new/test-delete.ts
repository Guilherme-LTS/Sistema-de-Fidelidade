import { db } from "./src/infra/database/db.js";
import { rewards } from "./src/infra/database/schema.js";
import { eq, and } from "drizzle-orm";

async function run() {
  try {
    const recompensaId = 182;
    const tenantId = "b909f257-2e1d-40d0-b30a-2009386341dd"; // I need to know a valid tenant ID, or just find the reward first

    const reward = await db.query.rewards.findFirst({
        where: eq(rewards.id, recompensaId)
    });
    console.log("Found reward:", reward);

    if (reward) {
        const [recompensa] = await db.update(rewards)
            .set({ deletedAt: new Date().toISOString(), isActive: false })
            .where(and(eq(rewards.id, recompensaId), eq(rewards.tenantId, reward.tenantId)))
            .returning();
        console.log("Updated reward:", recompensa);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
run();
