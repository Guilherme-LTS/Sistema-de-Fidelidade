import db from '../../infra/database/db';
import { Router, Request, Response } from 'express';
import { queryWithRLS, AuthenticatedRequest, setRlsClaims, resetRlsClaims } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import { logAuditEvent } from '../../shared/auditoria/audit';
import { upsertTenantCustomerByDocument } from '../../shared/customers/customer-identity';

const router = Router();

// POST /transactions - Lançar pontos (apenas admin)
router.post('/', verificaToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.usuario?.role !== 'admin' && authReq.usuario?.role !== 'operador') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores ou operadores podem lançar pontos.' });
  }

  const client = await db.connect();
  try {
    const { document, valor, nome } = req.body;
    const tenantId = authReq.usuario?.tenant_id;
    const valorNumerico = Number(valor);

    if (!document || !Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      return res.status(400).json({ error: 'CPF e valor (maior que zero) são obrigatórios.' });
    }
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
    }
    const cpfLimpo = document.replace(/\D/g, '');
    if (!cpfValidator.isValid(cpfLimpo)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    const operadorId = authReq.usuario?.id;
    const pontosGanhos = Math.floor(valorNumerico);

    await client.query('BEGIN');
    await setRlsClaims(client, authReq);

    // Buscar configurações dinamicamente do banco de dados
    const configResult = await client.query(`
      SELECT setting_key, setting_value FROM tenant_settings 
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND setting_key IN ('carencia_pontos', 'expiracao_pontos')
    `, [tenantId]);
    
    // Fallback mapeado
    const configs = {
      carencia_pontos: 0,
      expiracao_pontos: 180
    };
    
    configResult.rows.forEach(row => {
      configs[row.setting_key as keyof typeof configs] = row.setting_value;
    });

    const diasParaLiberacao = configs.carencia_pontos;
    const diasParaVencimento = configs.expiracao_pontos;

    const agora = new Date();
    // A data de liberação é agora + carência
    const availableAt = new Date(agora.getTime() + (diasParaLiberacao * 24 * 60 * 60 * 1000));
    // A data de vencimento é contada a partir da data de liberação + tempo de expiração validado
    const expiresAt = new Date(availableAt.getTime() + (diasParaVencimento * 24 * 60 * 60 * 1000));
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

    await client.query('COMMIT');
    res.status(201).json({ message: 'Transação registrada! Pontos ficarão disponíveis em breve.', pontosGanhos });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Erro ao processar a transação:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.', details: (error as Error).message });
  } finally {
    if (client) {
      await resetRlsClaims(client).catch(() => {});
      client.release();
    }
  }
});

export default router;
