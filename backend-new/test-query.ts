import { db } from "./src/infra/database/db.js";

async function run() {
  try {
    const tenantUserRecord = await db.query.tenantUsers.findFirst({
      where: (tu, { eq, and, isNull }) =>
        and(
          eq(tu.userId, "00000000-0000-0000-0000-000000000000"),
          eq(tu.isActive, true),
          isNull(tu.deletedAt)
        ),
      with: {
        tenant: true,
      },
    });
    console.log("Success:", tenantUserRecord);
  } catch (error) {
    console.error("DB Error:", error);
  }
  process.exit(0);
}

run();
