import { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/security/require-auth.js";
import { successResponse } from "../../shared/http/response.js";

export async function authRoutes(app: FastifyInstance) {
  // Rota para obter os dados do usuário autenticado
  app.get(
    "/me",
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      // O request.user é populado pelo requireAuth
      const user = request.user!;

      // Retorna os dados mapeados para o que o frontend espera (UsuarioPerfil)
      return successResponse({
        id: user.tenantUserId,
        user_id: user.authUserId,
        nome: user.name,
        email: user.email,
        role: user.role,
        tenant_id: user.tenantId,
      });
    }
  );
}
