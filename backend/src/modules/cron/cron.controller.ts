import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse, errorResponse } from "../../shared/http/response.js";
import { db } from "../../infra/database/db.js";
import { transactions, expirations, expirationItems, auditLogs, customers, consumerProfiles } from "../../infra/database/schema.js";
import { sql, lt, and, gt, eq } from "drizzle-orm";

export const cronController = {
  async processExpirations(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return reply.status(401).send(errorResponse("Acesso negado ao webhook de Cron", "UNAUTHORIZED"));
    }

    try {
      // Begin transaction to ensure data integrity
      await db.transaction(async (tx) => {
        // SKIP LOCKED garante que se duas execuções do cron rodarem em sobreposição
        // (ex: retry de timeout, deploy durante execução), a segunda instância não
        // processará as mesmas linhas — ela simplesmente pula as linhas bloqueadas.
        const expiredTransactions = await tx
          .select({
            transaction: transactions,
            customerName: consumerProfiles.name,
            customerDocument: consumerProfiles.document,
          })
          .from(transactions)
          .innerJoin(customers, eq(transactions.customerId, customers.id))
          .innerJoin(consumerProfiles, eq(customers.consumerProfileId, consumerProfiles.id))
          .where(
            and(
              lt(transactions.expiresAt, new Date().toISOString()),
              gt(transactions.remainingPoints, 0)
            )
          )
          .for("update", { skipLocked: true });

        let totalExpired = 0;

        for (const row of expiredTransactions) {
          const trx = row.transaction;
          if (!trx.customerId || !trx.tenantId) continue;

          const pointsToExpire = trx.remainingPoints;

          // 1. Create expiration record
          const [expiration] = await tx
            .insert(expirations)
            .values({
              customerId: trx.customerId,
              tenantId: trx.tenantId,
              pointsExpired: pointsToExpire,
            })
            .returning();

          // 2. Create expiration item
          await tx
            .insert(expirationItems)
            .values({
              expirationId: expiration.id,
              transactionId: trx.id,
              pointsDeducted: pointsToExpire,
            });

          // 3. Update the transaction to zero out remaining points
          await tx
            .update(transactions)
            .set({
              remainingPoints: 0,
              updatedAt: new Date().toISOString(),
            })
            .where(sql`id = ${trx.id}`);

          // 4. Log the audit
          await tx
            .insert(auditLogs)
            .values({
              tenantId: trx.tenantId,
              action: "POINTS_EXPIRED",
              entityType: "TRANSACTION",
              entityId: String(trx.id),
              metadata: JSON.stringify({
                clienteId: trx.customerId,
                clienteNome: row.customerName,
                clienteCpf: row.customerDocument,
                pontosExpirados: pointsToExpire,
                motivo: "Expiração automática conforme regras do programa de fidelidade.",
                dataExpiracao: new Date().toISOString()
              }),
            });

          totalExpired += pointsToExpire;
        }

        request.log.info(`[CRON] Expirations processed. Total transactions affected: ${expiredTransactions.length}. Total points expired: ${totalExpired}`);
      });

      return successResponse({ message: "Expirações processadas com sucesso." });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send(errorResponse("Erro interno ao processar expirações", "INTERNAL_ERROR"));
    }
  }
};
