import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../../src/app.js";
import { NotFoundError } from "../../src/shared/errors/app-error.js";

describe("Error Handling Integration", () => {
  beforeAll(async () => {
    // Registramos rotas de teste apenas para esta suite de testes de integração
    app.get("/test-error-not-found", async () => {
      throw new NotFoundError("Recurso de teste não encontrado");
    });

    app.get("/test-error-generic", async () => {
      throw new Error("Erro inesperado de teste");
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should handle custom AppErrors and respond with standard JSON format and matching status code", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test-error-not-found",
    });

    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.body);
    expect(body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Recurso de teste não encontrado",
      },
    });
  });

  it("should handle generic errors, redact original message and respond with INTERNAL_SERVER_ERROR", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test-error-generic",
    });

    expect(response.statusCode).toBe(500);

    const body = JSON.parse(response.body);
    expect(body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Ocorreu um erro interno no servidor.",
      },
    });
  });
});
