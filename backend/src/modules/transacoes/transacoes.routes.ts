import { Router, Request, Response } from 'express';
import { AuthenticatedRequest, withRlsTransaction } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import { logAuditEvent } from '../../shared/auditoria/audit';
import { upsertTenantCustomerByDocument } from '../../shared/customers/customer-identity';
import { getTenantId, TENANT_NOT_FOUND_ERROR } from '../../shared/request-context';
import { calculatePointTimelines, loadTenantPointSettings } from '../../shared/pontos/pontos-service';

const router = Router();

router.post('/', verificaToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.usuario?.role !== 'admin' && authReq.usuario?.role !== 'operador') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores ou operadores podem lançar pontos.' });
  }

  try {
    const { document, valor, nome } = req.body;
    const tenantId = getTenantId(authReq);
    const valorNumerico = Number(valor);

    if (!document || !Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      return res.status(400).json({ error: 'CPF e valor (maior que zero) são obrigatórios.' });
    }
    if (!tenantId) {
      return res.status(400).json({ error: TENANT_NOT_FOUND_ERROR });
    }

    const cpfLimpo = document.replace(/\D/g, '');
    if (!cpfValidator.isValid(cpfLimpo)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    const operadorId = authReq.usuario?.id;
    const pontosGanhos = Math.floor(valorNumerico);

    await withRlsTransaction(authReq, async (client) => {
      const configs = await loadTenantPointSettings(client, tenantId);
      const { availableAt, expiresAt } = calculatePointTimelines(configs.carencia_pontos, configs.expiracao_pontos);

      const cliente = await upsertTenantCustomerByDocument(client, {
        tenantId,
        document: cpfLimpo,
        name: nome,
        lgpdConsent: false,
        consentDate: null,
      });

      const transactionResult = await client.query(
        `INSERT INTO transactions (customer_id, amount_spent, points_earned, remaining_points, available_at, expires_at, operator_id, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [cliente.id, valorNumerico, pontosGanhos, pontosGanhos, availableAt, expiresAt, operadorId, tenantId]
      );

      try {
        await client.query('SAVEPOINT audit_log');
        await logAuditEvent({
          req,
          client,
          tenantId,
          operatorId: operadorId || null,
          action: 'LANCAMENTO_PONTOS',
          details: `Lancamento de ${pontosGanhos} pontos para CPF ${cpfLimpo}. Valor da compra: R$ ${valorNumerico.toFixed(2)}.`,
          targetLabel: cliente.name || nome || `CPF ${cpfLimpo}`,
          impactLabel: `+${pontosGanhos} pts`,
          status: 'SUCESSO',
          entityType: 'transaction',
          entityId: transactionResult.rows[0]?.id
        });
        await client.query('RELEASE SAVEPOINT audit_log');
      } catch (auditError) {
        await client.query('ROLLBACK TO SAVEPOINT audit_log').catch(() => {});
        console.error('Falha ao registrar auditoria do lançamento de pontos:', auditError);
      }
    });

    return res.status(201).json({ message: 'Transação registrada! Pontos ficarão disponíveis em breve.', pontosGanhos });
  } catch (error) {
    console.error('Erro ao processar a transação:', error);
    return res.status(500).json({ error: 'Ocorreu um erro no servidor.', details: (error as Error).message });
  }
});

export default router;
