import { FastifyInstance, FastifyError } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./app-error.js";
import { logger } from "../../infra/logger/logger.js";

export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    // 1. Zod Error (Zod Validation)
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));

      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Payload inválido.",
          details: issues,
        },
      });
    }

    // 2. Custom App Error
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    // 3. Fastify Validation Error (from native schemas if used)
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Validação da requisição falhou.",
          details: error.validation,
        },
      });
    }

    // 4. Unexpected internal errors
    logger.error(
      {
        err: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        req: {
          url: request.url,
          method: request.method,
        },
      },
      "Unexpected error occurred in request handler"
    );

    return reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Ocorreu um erro interno no servidor.",
      },
    });
  });
}
