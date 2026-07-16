import { describe, it, expect } from "vitest";
import { requireSubscription } from "../../src/shared/security/require-subscription.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "../../src/shared/errors/app-error.js";

const mockRequest = (user: any, method = "POST") => ({
  user,
  method,
} as unknown as FastifyRequest);

const mockReply = {} as FastifyReply;

describe("requireSubscription Middleware Validation", () => {
  it("should bypass verification if request method is GET", async () => {
    const req = mockRequest({
      role: "admin",
      subscriptionStatus: "past_due",
      subscriptionCurrentPeriodEnd: new Date(Date.now() - 3600000).toISOString(),
    }, "GET");

    // Deve passar sem erro
    await expect(requireSubscription(req, mockReply)).resolves.toBeUndefined();
  });

  it("should bypass verification if user role is novato", async () => {
    const req = mockRequest({
      role: "novato",
      subscriptionStatus: "past_due",
    }, "POST");

    await expect(requireSubscription(req, mockReply)).resolves.toBeUndefined();
  });

  it("should allow active subscription even if periodEnd is in the past (active grace period)", async () => {
    const req = mockRequest({
      role: "admin",
      subscriptionStatus: "active",
      subscriptionCurrentPeriodEnd: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
    }, "POST");

    // Deve passar sem erro
    await expect(requireSubscription(req, mockReply)).resolves.toBeUndefined();
  });

  it("should block trialing subscription if trial end date is in the past", async () => {
    const req = mockRequest({
      role: "admin",
      subscriptionStatus: "trialing",
      subscriptionCurrentPeriodEnd: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
    }, "POST");

    // Deve lançar erro 402 Payment Required
    await expect(requireSubscription(req, mockReply)).rejects.toThrow(
      new AppError(
        "Acesso suspenso. O período de testes (trial) terminou ou há pendências financeiras. Regularize sua assinatura nas configurações.",
        402
      )
    );
  });

  it("should allow trialing subscription if trial end date is in the future", async () => {
    const req = mockRequest({
      role: "admin",
      subscriptionStatus: "trialing",
      subscriptionCurrentPeriodEnd: new Date(Date.now() + 3600000).toISOString(), // 1 hora no futuro
    }, "POST");

    // Deve passar sem erro
    await expect(requireSubscription(req, mockReply)).resolves.toBeUndefined();
  });

  it("should block past_due subscription", async () => {
    const req = mockRequest({
      role: "admin",
      subscriptionStatus: "past_due",
      subscriptionCurrentPeriodEnd: new Date(Date.now() + 3600000).toISOString(),
    }, "POST");

    await expect(requireSubscription(req, mockReply)).rejects.toThrow(
      new AppError(
        "Acesso suspenso. O período de testes (trial) terminou ou há pendências financeiras. Regularize sua assinatura nas configurações.",
        402
      )
    );
  });
});
