import { eq, and, asc, sql } from "drizzle-orm";
import { db } from "../../infra/database/db.js";
import { rewards, redemptions, transactions, customers } from "../../infra/database/schema.js";
import { AppError, NotFoundError } from "../../shared/errors/app-error.js";
import { clientesService } from "../clientes/clientes.service.js";

type ResgatarPremioInput = {
  tenantId: string;
  operatorId?: string;
  document: string;
  rewardId: number;
};

export class ResgatesService {
  async resgatarPremio(input: ResgatarPremioInput) {
    return await db.transaction(async (tx) => {
      // 1. Validar recompensa
      const recompensa = await tx.query.rewards.findFirst({
        where: (r, { eq, and }) => and(
          eq(r.id, input.rewardId),
          eq(r.tenantId, input.tenantId),
          eq(r.isActive, true),
          sql`${r.deletedAt} IS NULL`
        )
      });

      if (!recompensa) {
        throw new NotFoundError("Recompensa não encontrada ou inativa.");
      }

      // 2. Buscar cliente e validar saldo
      // Usar a mesma lógica de validação de CPF do clientesService
      const cliente = await clientesService.buscarPorCpf(input.tenantId, input.document);
      
      if (!cliente) {
        throw new NotFoundError("Cliente não encontrado.");
      }

      const saldoInfo = await clientesService.consultarSaldo(input.tenantId, input.document);

      if (saldoInfo.cliente.pontosDisponiveis < recompensa.pointsCost) {
        throw new AppError(`Saldo insuficiente. O cliente possui ${saldoInfo.cliente.pontosDisponiveis} pontos, mas o prêmio custa ${recompensa.pointsCost} pontos.`);
      }

      // 3. Registrar Resgate primeiro para obter o ID
      const [resgate] = await tx.insert(redemptions).values({
        customerId: cliente.id,
        rewardId: recompensa.id,
        pointsSpent: recompensa.pointsCost,
        operatorId: input.operatorId,
        tenantId: input.tenantId,
      }).returning();

      // 4. FIFO Dedução
      const now = new Date().toISOString();
      const historicoPositivo = await tx.query.transactions.findMany({
        where: (t, { eq, and }) => and(
          eq(t.customerId, cliente.id),
          eq(t.tenantId, input.tenantId),
          sql`${t.availableAt} <= ${now}`,
          sql`${t.expiresAt} > ${now}`,
          sql`${t.remainingPoints} > 0`
        ),
        orderBy: (t, { asc }) => [asc(t.expiresAt)],
      });

      let pontosRestantesParaDeduzir = recompensa.pointsCost;
      const ledgerItems = [];

      for (const transacao of historicoPositivo) {
        if (pontosRestantesParaDeduzir <= 0) break;

        const pontosDaTransacao = transacao.remainingPoints;
        const pontosAdeduzir = Math.min(pontosRestantesParaDeduzir, pontosDaTransacao);

        // Atualizar transação
        await tx.update(transactions)
          .set({
            remainingPoints: sql`${transactions.remainingPoints} - ${pontosAdeduzir}`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(transactions.id, transacao.id));

        // Registrar no ledger
        ledgerItems.push({
          redemptionId: resgate.id,
          transactionId: transacao.id,
          pointsDeducted: pontosAdeduzir,
        });

        pontosRestantesParaDeduzir -= pontosAdeduzir;
      }

      if (pontosRestantesParaDeduzir > 0) {
        // Isso não deveria acontecer porque verificamos o saldo global, mas previne anomalias de concorrência
        throw new AppError("Erro na dedução de pontos. Saldo insuficiente ou transações inválidas.");
      }

      // 5. Inserir itens de consumo
      if (ledgerItems.length > 0) {
        // Need to import redemptionItems at the top
        const { redemptionItems } = await import("../../infra/database/schema.js");
        await tx.insert(redemptionItems).values(ledgerItems);
      }

      return {
        resgate,
        recompensa: {
          name: recompensa.name,
          pointsCost: recompensa.pointsCost,
        },
        cliente: {
          nome: cliente.nome,
          document: cliente.document,
        }
      };
    });
  }
}

export const resgatesService = new ResgatesService();
