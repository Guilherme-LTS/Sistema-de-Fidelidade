import { Router, Request, Response } from 'express';
import { AuthenticatedRequest, withRlsTransaction } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';
import { logAuditEvent } from '../../shared/auditoria/audit';
import { resolveTenantCustomerByDocument } from '../../shared/customers/customer-identity';
import { getTenantId, TENANT_NOT_FOUND_ERROR } from '../../shared/request-context';
import { buildFifoDebitUpdates, buildFifoUpdateQuery } from '../../shared/pontos/pontos-service';

const router = Router();

class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// POST /redemptions - Resgatar recompensa
router.post('/', verificaToken, async (req: Request, res: Response) => {
  try {
    const { document, recompensa_id } = req.body;
    const authReq = req as AuthenticatedRequest;
    const operadorId = authReq.usuario?.id;
    const tenantId = getTenantId(authReq);
    const cpfLimpo = (document || '').replace(/\D/g, '');

    if (!cpfLimpo || !recompensa_id) {
      return res.status(400).json({ error: 'CPF e ID da recompensa são obrigatórios.' });
    }
    if (!tenantId) {
      return res.status(400).json({ error: TENANT_NOT_FOUND_ERROR });
    }

    const pontosRestantes = await withRlsTransaction(authReq, async (client) => {
      const cliente = await resolveTenantCustomerByDocument(client, tenantId, cpfLimpo);
      if (!cliente) throw new HttpError(404, 'Cliente não encontrado.');

      const recompensaResult = await client.query(
        'SELECT points_cost, name FROM rewards WHERE id = $1 AND tenant_id = $2 AND is_active = true',
        [recompensa_id, tenantId]
      );
      const recompensa = recompensaResult.rows[0];
      if (!recompensa) throw new HttpError(404, 'Recompensa não encontrada.');

      // 1. Busca transações válidas via FIFO (com lock para evitar race condition)
      const transacoesValidas = await client.query(
        `SELECT id, remaining_points FROM transactions
         WHERE customer_id = $1 AND tenant_id = $2 AND remaining_points > 0
         AND available_at <= NOW() AND expires_at > NOW()
         ORDER BY expires_at ASC, created_at ASC
         FOR UPDATE`,
        [cliente.id, tenantId]
      );

      const pontosDisponiveis = transacoesValidas.rows.reduce((acc, t) => acc + t.remaining_points, 0);

      if (pontosDisponiveis < recompensa.points_cost) {
        throw new HttpError(409, 'Pontos disponíveis insuficientes.');
      }

      const { updates } = buildFifoDebitUpdates(transacoesValidas.rows, recompensa.points_cost);

      // Executa um único UPDATE com CASE statement em vez de N queries
      if (updates.length > 0) {
        const { ids, caseClause } = buildFifoUpdateQuery(updates);

        await client.query(
          `UPDATE transactions SET remaining_points = ${caseClause} WHERE id = ANY($1) AND tenant_id = $2`,
          [ids, tenantId]
        );
      }

      // 3. Registra histórico do resgate
      const redemptionResult = await client.query(
        'INSERT INTO redemptions (customer_id, reward_id, points_spent, operator_id, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [cliente.id, recompensa_id, recompensa.points_cost, operadorId, tenantId]
      );

      await logAuditEvent({
        req,
        client,
        tenantId,
        operatorId: operadorId || null,
        action: 'RESGATE_RECOMPENSA',
        details: `Resgate de recompensa ${recompensa.name || recompensa_id} para CPF ${cpfLimpo}, consumindo ${recompensa.points_cost} pontos.`,
        targetLabel: recompensa.name || `Recompensa #${recompensa_id}`,
        impactLabel: `-${recompensa.points_cost} pts`,
        status: 'SUCESSO',
        entityType: 'redemption',
        entityId: redemptionResult.rows[0]?.id
      });

      return pontosDisponiveis - recompensa.points_cost;
    });

    res.status(200).json({ message: 'Recompensa resgatada com sucesso!', pontos_restantes: pontosRestantes });
  } catch (error: any) {
    console.error('Erro no resgate:', error);
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Ocorreu um erro no servidor.' });
  }
});

export default router;
