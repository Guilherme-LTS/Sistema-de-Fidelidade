import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../infra/database/db.js";
import { tenants } from "../../infra/database/schema.js";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "../../shared/http/response.js";

export async function publicRoutes(app: FastifyInstance) {
  app.get("/tenants/:slug", async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(400).send(errorResponse("Slug inválido.", "VALIDATION_ERROR"));
    }

    const { slug } = parsedParams.data;

    try {
      const [tenant] = await db
        .select({
          id: tenants.id,
          name: tenants.name,
          tradingName: tenants.tradingName,
          logoUrl: tenants.logoUrl,
          isActive: tenants.isActive,
        })
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      if (!tenant) {
        return reply.status(404).send(errorResponse("Estabelecimento não encontrado.", "NOT_FOUND"));
      }

      if (!tenant.isActive) {
        return reply.status(403).send(errorResponse("Estabelecimento inativo.", "FORBIDDEN"));
      }

      return successResponse(tenant);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse("Erro interno ao buscar estabelecimento.", "INTERNAL_ERROR"));
    }
  });
}
