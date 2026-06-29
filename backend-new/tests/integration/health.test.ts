import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../../src/app.js";

describe("GET /health", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should return 200 and success response format", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body).toEqual({
      success: true,
      data: expect.objectContaining({
        status: "ok",
        env: expect.any(String),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      }),
    });
  });
});
