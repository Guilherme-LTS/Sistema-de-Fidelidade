import { pino } from "pino";
import { env } from "../../config/env.js";

const isDevelopment = env.NODE_ENV === "development";

export const logger = pino({
  level: env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers['x-api-key']",
      "password",
      "token",
      "secret",
      "cpf",
      "serviceRoleKey",
      "supabaseKey",
    ],
    censor: "[REDACTED]",
  },
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});
