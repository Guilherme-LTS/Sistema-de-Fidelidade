import fastify from "fastify";
import { recompensasController } from "./src/modules/recompensas/recompensas.controller.js";
import { setupErrorHandler } from "./src/shared/errors/error-handler.js";

async function run() {
  const app = fastify({ logger: true });
  setupErrorHandler(app);

  app.decorateRequest("user", null);
  app.addHook("onRequest", async (request) => {
    request.user = {
      authUserId: "mock",
      tenantUserId: "mock",
      tenantId: "b909f257-2e1d-40d0-b30a-2009386341dd", // Fake tenant
      role: "admin",
      name: "Mock"
    };
  });

  // Manually register route without requireAuth
  app.delete("/recompensas/:id", (req, rep) => recompensasController.excluir(req, rep));

  await app.ready();

  try {
    const res = await app.inject({
      method: "DELETE",
      url: "/recompensas/183", // The id the user mentioned
    });

    console.log("STATUS:", res.statusCode);
    console.log("BODY:", res.body);
  } catch (err) {
    console.error("FATAL:", err);
  }

  process.exit(0);
}

run();
