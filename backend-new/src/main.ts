// Primeiro carregamos as configurações e env vars para validação rápida no boot
import { env } from "./config/env.js";
import { app } from "./app.js";
import { logger } from "./infra/logger/logger.js";

const start = async () => {
  try {
    const port = env.PORT;
    // Vinculamos a 0.0.0.0 para suportar execução em contêineres e na nuvem
    const host = "0.0.0.0";

    await app.listen({ port, host });
    logger.info(`🚀 Server running on http://localhost:${port} in [${env.NODE_ENV}] mode`);
  } catch (err) {
    logger.error(err, "❌ Failed to start server");
    process.exit(1);
  }
};

// Tratamento de sinais para encerramento gracioso
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  try {
    await app.close();
    logger.info("Server closed successfully. Goodbye!");
    process.exit(0);
  } catch (err) {
    logger.error(err, "Error closing server");
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
