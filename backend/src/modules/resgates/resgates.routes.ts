import db from '../../infra/database/db';
import { Router, Request, Response } from 'express';
import { queryWithRLS, AuthenticatedRequest } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';
import { logAuditEvent } from '../../shared/auditoria/audit';
import { resolveTenantCustomerByDocument } from '../../shared/customers/customer-identity';

const router = Router();

// POST /redemptions - Resgatar recompensa
router.post('/', verificaToken, async (req: Request, res: Response) => {
  const client = await db.connect();
  try {
    const { document, recompensa_id } = req.body;
    const authReq = req as AuthenticatedRequest;
    const operadorId = authReq.usuario?.id;
    const tenantId = authReq.usuario?.tenant_id;
    const cpfLimpo = (document || '').replace(/\D/g, '');

    if (!cpfLimpo || !recompensa_id) {
      return res.status(400).json({ error: 'CPF e ID da recompensa são obrigatórios.' });
    }
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
    }

    const { setRlsClaims, resetRlsClaims } = require('../../infra/database/db-rls');

    await client.query('BEGIN');
    await setRlsClaims(client, authReq);

    const cliente = await resolveTenantCustomerByDocument(client, tenantId, cpfLimpo);
    if (!cliente) throw new Error('Cliente não encontrado.');

    const recompensaResult = await client.query(
      'SELECT points_cost, name FROM rewards WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      [recompensa_id, tenantId]
    );
    const recompensa = recompensaResult.rows[0];
    if (!recompensa) throw new Error('Recompensa não encontrada.');

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
      throw new Error('Pontos disponíveis insuficientes.');
    }

    // 2. Aplica débito abatendo FIFO das transações (otimizado: batch UPDATE com CASE)
    // Calcula quanto descontar de cada transação em FIFO order
    let pontosNecessarios = recompensa.points_cost;
    const updates: { id: number; descontar: number }[] = [];
    
    for (const t of transacoesValidas.rows) {
      if (pontosNecessarios <= 0) break;
      const descontar = Math.min(t.remaining_points, pontosNecessarios);
      updates.push({ id: t.id, descontar });
      pontosNecessarios -= descontar;
    }

    // Executa um único UPDATE com CASE statement em vez de N queries
    if (updates.length > 0) {
      let caseClause = 'CASE id\n';
      const ids: number[] = [];
      updates.forEach(u => {
        caseClause += `WHEN ${u.id} THEN remaining_points - ${u.descontar}\n`;
        ids.push(u.id);
      });
      caseClause += 'ELSE remaining_points\nEND';

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

    await client.query('COMMIT');

    const pontosRestantes = pontosDisponiveis - recompensa.points_cost;
    res.status(200).json({ message: 'Recompensa resgatada com sucesso!', pontos_restantes: pontosRestantes });
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Erro no resgate:', error);
    res.status(500).json({ error: error.message || 'Ocorreu um erro no servidor.' });
  } finally {
    if (client) {
      const { resetRlsClaims } = require('../../infra/database/db-rls');
      await resetRlsClaims(client).catch(() => {});
      client.release();
    }
  }
});

export default router;