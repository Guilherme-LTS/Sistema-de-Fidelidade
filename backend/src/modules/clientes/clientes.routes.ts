import db from '../../infra/database/db';
import { Router, Request, Response } from 'express';
import { queryWithRLS, AuthenticatedRequest } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';

const router = Router();

// GET /customers - Listar customers com busca e paginação
router.get('/', verificaToken, async (req: Request, res: Response) => {
  const { busca, page = 1, limit = 15 } = req.query;

  try {
    const offset = ((page as any) - 1) * (limit as any);
    let totalClientes;
    let customers;

    if (busca && (busca as string).trim() !== '') {
      const termoBuscaNome = `%${busca}%`;
      const cpfBusca = (busca as string).replace(/\D/g, '');

      let whereClause = 'WHERE nome ILIKE $1';
      let params: any[] = [termoBuscaNome];

      if (cpfBusca) {
        whereClause += ' OR document LIKE $2';
        params.push(`%${cpfBusca}%`);
      }

      const countResult = await queryWithRLS(req as AuthenticatedRequest, `SELECT COUNT(*) FROM customers ${whereClause}`, params);
      totalClientes = parseInt(countResult.rows[0].count, 10);

      const limitOffsetPlaceholders = `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      const dataResult = await db.query(
        `SELECT id, nome, document FROM customers ${whereClause} ORDER BY nome ASC ${limitOffsetPlaceholders}`,
        [...params, limit, offset]
      );
      customers = dataResult.rows;
    } else {
      const countResult = await queryWithRLS(req as AuthenticatedRequest, 'SELECT COUNT(*) FROM customers');
      totalClientes = parseInt(countResult.rows[0].count, 10);

      const dataResult = await db.query(
        'SELECT id, nome, document FROM customers ORDER BY nome ASC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      customers = dataResult.rows;
    }

    res.status(200).json({
      customers,
      total: totalClientes,
      paginaAtual: parseInt(page as string, 10),
      totalPaginas: Math.ceil(totalClientes / (limit as any)),
    });
  } catch (error) {
    console.error('Erro ao listar customers:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// GET /customers/:document - Consultar saldo de pontos
router.get('/:document', async (req: Request, res: Response) => {
  try {
    const cpfParam = (req.params.document as string).replace(/\D/g, '');
    if (!cpfParam || cpfParam.length !== 11) {
      return res.status(400).json({ error: 'Formato de CPF inválido.' });
    }

    const clienteResult = await queryWithRLS(req as AuthenticatedRequest, 'SELECT id, nome, document FROM customers WHERE document = $1', [cpfParam]);
    const cliente = clienteResult.rows[0];
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const clienteId = cliente.id;

    const creditosResult = await db.query(
      `SELECT COALESCE(SUM(pontos_restantes), 0) as total FROM transactions WHERE cliente_id = $1 AND data_liberacao <= NOW() AND data_vencimento > NOW()`,
      [clienteId]
    );
    const pontosDisponiveis = parseInt(creditosResult.rows[0].total);

    const pontosPendentesResult = await db.query(
      `SELECT COALESCE(SUM(pontos_restantes), 0) as total FROM transactions WHERE cliente_id = $1 AND data_liberacao > NOW()`,
      [clienteId]
    );
    const pontosPendentes = parseInt(pontosPendentesResult.rows[0].total);

    const proximoVencimentoResult = await db.query(
      `SELECT MIN(data_vencimento) as proximo_vencimento FROM transactions WHERE cliente_id = $1 AND data_vencimento > NOW() AND data_liberacao <= NOW() AND pontos_restantes > 0`,
      [clienteId]
    );
    const proximoVencimento = proximoVencimentoResult.rows[0].proximo_vencimento;

    const expiracaoUrgenteResult = await db.query(
      `SELECT COALESCE(SUM(pontos_restantes), 0) as pontos_expirando, MIN(data_vencimento) as data_proxima_expiracao FROM transactions WHERE cliente_id = $1 AND data_liberacao <= NOW() AND data_vencimento > NOW() AND data_vencimento <= NOW() + INTERVAL '7 days' AND pontos_restantes > 0`,
      [clienteId]
    );
    const pontosExpirando = parseInt(expiracaoUrgenteResult.rows[0].pontos_expirando, 10) || 0;
    const dataProximaExpiracao = expiracaoUrgenteResult.rows[0].data_proxima_expiracao;

    const liberacaoUrgenteResult = await db.query(
      `SELECT MIN(data_liberacao) as data_proxima_liberacao FROM transactions WHERE cliente_id = $1 AND data_liberacao > NOW() AND pontos_restantes > 0`,
      [clienteId]
    );
    const dataProximaLiberacao = liberacaoUrgenteResult.rows[0].data_proxima_liberacao;

    res.status(200).json({
      nome: cliente.nome,
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
router.get('/:document/extrato', async (req: Request, res: Response) => {
  try {
    const cpfParam = (req.params.document as string).replace(/\D/g, '');
    if (!cpfParam || cpfParam.length !== 11) {
      return res.status(400).json({ error: 'Formato de CPF inválido.' });
    }

    const clienteResult = await queryWithRLS(req as AuthenticatedRequest, 'SELECT id FROM customers WHERE document = $1', [cpfParam]);
    const cliente = clienteResult.rows[0];
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    const clienteId = cliente.id;

    const limit = parseInt((req.query.limit as string) || '100', 10);
    const combinedQuery = `
      SELECT * FROM (
        SELECT 'credito' as tipo, pontos_ganhos as pontos, data_transacao as data, 'Pontos por compra' as descricao 
        FROM transactions WHERE cliente_id = $1
        UNION ALL
        SELECT 'debito' as tipo, res.pontos_gastos as pontos, res.data_resgate as data, rec.nome as descricao 
        FROM redemptions res JOIN rewards rec ON res.recompensa_id = rec.id WHERE res.cliente_id = $1
      ) as extrato_unificado
      ORDER BY data DESC
      LIMIT $2
    `;
    const extratoResult = await queryWithRLS(req as AuthenticatedRequest, combinedQuery, [clienteId, limit]);
    res.status(200).json(extratoResult.rows);
  } catch (error) {
    console.error('Erro ao buscar extrato do cliente:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// POST /customers/cadastro - Cadastrar novo cliente
router.post('/cadastro', async (req: Request, res: Response) => {
  const { nome, document, lgpd_consentimento } = req.body;

  if (!nome || !document) {
    return res.status(400).json({ error: 'Nome e CPF são obrigatórios.' });
  }
  if (lgpd_consentimento !== true) {
    return res.status(400).json({ error: 'É necessário aceitar os termos de uso e a política de privacidade.' });
  }

  const cpfLimpo = document.replace(/\D/g, '');
  if (!cpfValidator.isValid(cpfLimpo)) {
    return res.status(400).json({ error: 'O CPF informado é inválido.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const existingClientResult = await client.query('SELECT * FROM customers WHERE document = $1', [cpfLimpo]);
    const existingClient = existingClientResult.rows[0];

    let finalClient;

    if (existingClient) {
      if (existingClient.nome) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Este CPF já está cadastrado em nosso sistema.' });
      } else {
        const updatedClientResult = await client.query(
          `UPDATE customers 
           SET nome = $1, lgpd_consentimento = $2, data_consentimento = $3 
           WHERE document = $4 
           RETURNING id, nome, document`,
          [nome, lgpd_consentimento, new Date(), cpfLimpo]
        );
        finalClient = updatedClientResult.rows[0];
      }
    } else {
      const newClientResult = await client.query(
        `INSERT INTO customers (nome, document, lgpd_consentimento, data_consentimento) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, nome, document`,
        [nome, cpfLimpo, lgpd_consentimento, new Date()]
      );
      finalClient = newClientResult.rows[0];
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Cadastro realizado com sucesso!',
      cliente: finalClient,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao cadastrar cliente:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao realizar o cadastro.' });
  } finally {
    if (client) client.release();
  }
});

export default router;
