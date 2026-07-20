import fastify from "fastify";
import { successResponse } from "./src/shared/http/response.js";

async function run() {
  const app = fastify();

  app.delete("/recompensas/:id", async (req, rep) => {
    return successResponse(null, "Recompensa arquivada com sucesso.");
  });

  await app.ready();

  const res = await app.inject({
    method: "DELETE",
    url: "/recompensas/183",
  });

  console.log("STATUS:", res.statusCode);
  console.log("BODY:", res.body);
  process.exit(0);
}

run();
