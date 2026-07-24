import { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";

/**
 * Middleware/Hook para garantir que o Tenant tenha uma assinatura ativa ou trial válido.
 * Lojistas inadimplentes ou com trial vencido receberão erro HTTP 402 Payment Required.
 */
export async function requireSubscription(request: FastifyRequest, _reply: FastifyReply) {
  const user = request.user;

  if (!user) {
    throw new AppError("Não autenticado.", 401);
  }

  // Permite todas as requisições de leitura (Visualização de Dashboard, Clientes, etc.)
  // O bloqueio de assinatura só se aplica a mutações (POST, PUT, PATCH, DELETE)
  if (request.method === "GET") {
    return;
  }

  // Se for um usuário sem tenant ainda (novato), ignora a verificação
  if (user.role === "novato") {
    return;
  }

  const status = user.subscriptionStatus;
  const periodEnd = user.subscriptionCurrentPeriodEnd;

  // Assinaturas ativas são sempre válidas
  if (status === "active") {
    return;
  }

  // Período de teste (trialing) é válido se a data de encerramento for futura ou ausente
  if (status === "trialing") {
    if (!periodEnd || new Date(periodEnd) > new Date()) {
      return;
    }
  }

  // Retorna HTTP 402 para sinalizar ao frontend que o pagamento é necessário
  throw new AppError(
    "Acesso suspenso. O período de testes (trial) terminou ou há pendências financeiras. Regularize sua assinatura nas configurações.",
    402
  );
}
