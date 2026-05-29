import db from '../../infra/database/db';
import { Router, Request, Response } from 'express';
import { queryWithRLS, AuthenticatedRequest } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';
import { validateAndCleanCPF } from '../../shared/validators/cpf';
import { upsertTenantCustomerByDocument } from '../../shared/customers/customer-identity';
import { getTenantId, TENANT_NOT_FOUND_ERROR } from '../../shared/request-context';
import { findCustomerByDocument, getCustomerFinancialSummary, getCustomerStatement, listCustomers } from '../../shared/customers/customer-queries';

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
  const tenantId = getTenantId(authReq);

  if (!tenantId) {
    return res.status(400).json({ error: TENANT_NOT_FOUND_ERROR });
  }

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const { total, customers } = await listCustomers(authReq, {
      busca: busca as string | undefined,
      page: pageNum,
      limit: limitNum,
      tenantId,
    });

    res.status(200).json({
      customers,
      total,
      paginaAtual: pageNum,
      totalPaginas: Math.ceil(total / limitNum),
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
    const tenantId = getTenantId(authReq);
    const cpfParam = (req.params.document as string).replace(/\D/g, '');
    if (!tenantId) {
      return res.status(400).json({ error: TENANT_NOT_FOUND_ERROR });
    }
    if (!cpfParam || cpfParam.length !== 11) {
      return res.status(400).json({ error: 'Formato de CPF inválido.' });
    }

    const cliente = await findCustomerByDocument(authReq, tenantId, cpfParam);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const clienteId = cliente.id;
    const summary = await getCustomerFinancialSummary(authReq, tenantId, clienteId);

    res.status(200).json({
      nome: cliente.name,
      document: cliente.document,
      ...summary,
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
    const tenantId = getTenantId(authReq);
    const cpfParam = (req.params.document as string).replace(/\D/g, '');
    if (!tenantId) {
      return res.status(400).json({ error: TENANT_NOT_FOUND_ERROR });
    }
    if (!cpfParam || cpfParam.length !== 11) {
      return res.status(400).json({ error: 'Formato de CPF inválido.' });
    }

    const cliente = await findCustomerByDocument(authReq, tenantId, cpfParam);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    const clienteId = cliente.id;

    const limit = parseInt((req.query.limit as string) || '100', 10);
    const extrato = await getCustomerStatement(authReq, tenantId, clienteId, limit);
    res.status(200).json(extrato);
  } catch (error) {
    console.error('Erro ao buscar extrato do cliente:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// POST /customers/cadastro - Cadastrar novo cliente (agora protegido)
router.post('/cadastro', verificaToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { nome, document, lgpd_consentimento } = req.body;
  const tenantId = getTenantId(authReq);

  if (!nome || !document) {
    return res.status(400).json({ error: 'Nome e CPF são obrigatórios.' });
  }
  if (lgpd_consentimento !== true) {
    return res.status(400).json({ error: 'É necessário aceitar os termos de uso e a política de privacidade.' });
  }
  if (!tenantId) {
    return res.status(400).json({ error: TENANT_NOT_FOUND_ERROR });
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
