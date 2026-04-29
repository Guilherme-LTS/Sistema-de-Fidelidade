import db from '../../infra/database/db';
import { Router, Request, Response } from 'express';
import { queryWithRLS, AuthenticatedRequest } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';
import { validateAndCleanCPF } from '../../shared/validators/cpf';
import { upsertTenantCustomerByDocument } from '../../shared/customers/customer-identity';

const router = Router();

interface PaginationQuery {
  busca?: string;
  page?: string;
  limit?: string;
}

// GET /customers - Listar customers com busca e paginação
router.get('/', verificaToken, async (req: Request, res: Response) => {
  const { busca, page = '1', limit = '15' } = req.query as PaginationQuery;
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.usuario?.tenant_id;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
  }

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    let totalClientes: number;
    let customers: any[];

    if (busca && (busca as string).trim() !== '') {
      const termoBuscaNome = `%${busca}%`;
      const cpfBusca = (busca as string).replace(/\D/g, '');

      let whereClause = 'WHERE c.tenant_id = $1 AND c.deleted_at IS NULL AND (COALESCE(c.name, cp.name) ILIKE $2';
      const params: any[] = [tenantId, termoBuscaNome];

      if (cpfBusca) {
        whereClause += ' OR COALESCE(cp.document, c.document) LIKE $3';
        params.push(`%${cpfBusca}%`);
      }

      whereClause += ')';

      const countResult = await queryWithRLS(
        authReq,
        `SELECT COUNT(*) FROM customers c LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id ${whereClause}`,
        params,
      );
      totalClientes = parseInt(countResult.rows[0].count, 10);

      const limitOffsetPlaceholders = `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      const dataResult = await queryWithRLS(
        authReq,
        `
          SELECT
            c.id,
            COALESCE(c.name, cp.name) AS name,
            COALESCE(cp.document, c.document) AS document
          FROM customers c
          LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
          ${whereClause}
          ORDER BY COALESCE(c.name, cp.name) ASC
          ${limitOffsetPlaceholders}
        `,
        [...params, limitNum, offset],
      );
      customers = dataResult.rows;
    } else {
      const countResult = await queryWithRLS(authReq, 'SELECT COUNT(*) FROM customers WHERE tenant_id = $1 AND deleted_at IS NULL', [tenantId]);
      totalClientes = parseInt(countResult.rows[0].count, 10);

      const dataResult = await queryWithRLS(
        authReq,
        `
          SELECT
            c.id,
            COALESCE(c.name, cp.name) AS name,
            COALESCE(cp.document, c.document) AS document
          FROM customers c
          LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
          WHERE c.tenant_id = $1
            AND c.deleted_at IS NULL
          ORDER BY COALESCE(c.name, cp.name) ASC
          LIMIT $2 OFFSET $3
        `,
        [tenantId, limitNum, offset],
      );
      customers = dataResult.rows;
    }

    res.status(200).json({
      customers,
      total: totalClientes,
      paginaAtual: pageNum,
      totalPaginas: Math.ceil(totalClientes / limitNum),
    });
  } catch (error) {
    console.error('Erro ao listar customers:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// GET /customers/:document - Consultar saldo de pontos
router.get('/:document', verificaToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.usuario?.tenant_id;
    const cpfParam = (req.params.document as string).replace(/\D/g, '');
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
    }
    if (!cpfParam || cpfParam.length !== 11) {
      return res.status(400).json({ error: 'Formato de CPF inválido.' });
    }

    const clienteResult = await queryWithRLS(
      authReq,
      `
        SELECT
          c.id,
          COALESCE(c.name, cp.name) AS name,
          COALESCE(cp.document, c.document) AS document
        FROM customers c
        LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
        WHERE COALESCE(cp.document, c.document) = $1
          AND c.tenant_id = $2
          AND c.deleted_at IS NULL
        LIMIT 1
      `,
      [cpfParam, tenantId],
    );
    const cliente = clienteResult.rows[0];
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const clienteId = cliente.id;

    const creditosResult = await queryWithRLS(authReq,
      `SELECT COALESCE(SUM(remaining_points), 0) as total FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND available_at <= NOW() AND expires_at > NOW()`,
      [clienteId, tenantId]
    );
    const pontosDisponiveis = parseInt(creditosResult.rows[0].total, 10) || 0;

    const pontosPendentesResult = await queryWithRLS(authReq,
      `SELECT COALESCE(SUM(remaining_points), 0) as total FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND available_at > NOW()`,
      [clienteId, tenantId]
    );
    const pontosPendentes = parseInt(pontosPendentesResult.rows[0].total, 10) || 0;

    const proximoVencimentoResult = await queryWithRLS(authReq,
      `SELECT MIN(expires_at) as proximo_vencimento FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND expires_at > NOW() AND available_at <= NOW() AND remaining_points > 0`,
      [clienteId, tenantId]
    );
    const proximoVencimento = proximoVencimentoResult.rows[0].proximo_vencimento;

    const expiracaoUrgenteResult = await queryWithRLS(authReq,
      `SELECT COALESCE(SUM(remaining_points), 0) as pontos_expirando, MIN(expires_at) as data_proxima_expiracao FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND available_at <= NOW() AND expires_at > NOW() AND expires_at <= NOW() + INTERVAL '7 days' AND remaining_points > 0`,
      [clienteId, tenantId]
    );
    const pontosExpirando = parseInt(expiracaoUrgenteResult.rows[0].pontos_expirando, 10) || 0;
    const dataProximaExpiracao = expiracaoUrgenteResult.rows[0].data_proxima_expiracao;

    const liberacaoUrgenteResult = await queryWithRLS(authReq,
      `SELECT MIN(available_at) as data_proxima_liberacao FROM transactions WHERE customer_id = $1 AND tenant_id = $2 AND available_at > NOW() AND remaining_points > 0`,
      [clienteId, tenantId]
    );
    const dataProximaLiberacao = liberacaoUrgenteResult.rows[0].data_proxima_liberacao;

    res.status(200).json({
      nome: cliente.name,
      document: cliente.document,
      pontosDisponiveis,
      pontosPendentes,
      proximoVencimento,
      pontosExpirando,
      dataProximaExpiracao,
      dataProximaLiberacao,
    });
  } catch (error) {
    console.error('Erro ao consultar cliente:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// GET /customers/:document/extrato - Extrato de transações
router.get('/:document/extrato', verificaToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.usuario?.tenant_id;
    const cpfParam = (req.params.document as string).replace(/\D/g, '');
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
    }
    if (!cpfParam || cpfParam.length !== 11) {
      return res.status(400).json({ error: 'Formato de CPF inválido.' });
    }

    const clienteResult = await queryWithRLS(
      authReq,
      `
        SELECT c.id
        FROM customers c
        LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
        WHERE COALESCE(cp.document, c.document) = $1
          AND c.tenant_id = $2
          AND c.deleted_at IS NULL
        LIMIT 1
      `,
      [cpfParam, tenantId],
    );
    const cliente = clienteResult.rows[0];
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    const clienteId = cliente.id;

    const limit = parseInt((req.query.limit as string) || '100', 10);
    const combinedQuery = `
      SELECT * FROM (
        SELECT 'credito' as tipo, points_earned as pontos, created_at as data, 'Pontos por compra' as descricao 
        FROM transactions WHERE customer_id = $1 AND tenant_id = $2
        UNION ALL
        SELECT 'debito' as tipo, res.points_spent as pontos, res.created_at as data, rec.name as descricao 
        FROM redemptions res JOIN rewards rec ON res.reward_id = rec.id AND rec.tenant_id = $2 WHERE res.customer_id = $1 AND res.tenant_id = $2
      ) as extrato_unificado
      ORDER BY data DESC
      LIMIT $3
    `;
    const extratoResult = await queryWithRLS(authReq, combinedQuery, [clienteId, tenantId, limit]);
    res.status(200).json(extratoResult.rows);
  } catch (error) {
    console.error('Erro ao buscar extrato do cliente:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// POST /customers/cadastro - Cadastrar novo cliente (agora protegido)
router.post('/cadastro', verificaToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { nome, document, lgpd_consentimento } = req.body;
  const tenantId = authReq.usuario?.tenant_id;

  if (!nome || !document) {
    return res.status(400).json({ error: 'Nome e CPF são obrigatórios.' });
  }
  if (lgpd_consentimento !== true) {
    return res.status(400).json({ error: 'É necessário aceitar os termos de uso e a política de privacidade.' });
  }
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
  }

  const cpfValidation = validateAndCleanCPF(document);
  if (!cpfValidation.isValid) {
    return res.status(400).json({ error: cpfValidation.error });
  }
  const cpfLimpo = cpfValidation.cleaned;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const finalClient = await upsertTenantCustomerByDocument(
      client,
      {
        tenantId,
        document: cpfLimpo,
        name: nome,
        lgpdConsent: lgpd_consentimento,
        consentDate: new Date(),
      },
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Cadastro realizado com sucesso!',
      cliente: finalClient,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao cadastrar cliente:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao realizar o cadastro.' });
  } finally {
    client.release();
  }
});

export default router;
