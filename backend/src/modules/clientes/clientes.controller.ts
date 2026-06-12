import { Request, Response } from 'express';
import { AuthenticatedRequest, withRlsTransaction } from '../../infra/database/db-rls';
import { requireTenantId, requireUserRole } from '../../shared/request-context';
import { ClientesRepository } from './clientes.repository';
import { ClientesService } from './clientes.service';

interface PaginationQuery {
  busca?: string;
  page?: string;
  limit?: string;
}

export async function listarClientesController(req: Request, res: Response) {
  const { busca, page = '1', limit = '15' } = req.query as PaginationQuery;
  const authReq = req as AuthenticatedRequest;
  requireUserRole(authReq, ['admin', 'operador'], 'Acesso negado.');
  const tenantId = requireTenantId(authReq);
  const service = new ClientesService(new ClientesRepository(authReq));

  const result = await service.listarClientes({
    busca,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    tenantId,
  });

  return res.status(200).json(result);
}

export async function consultarSaldoController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  requireUserRole(authReq, ['admin', 'operador'], 'Acesso negado.');
  const tenantId = requireTenantId(authReq);
  const service = new ClientesService(new ClientesRepository(authReq));

  const result = await service.consultarSaldo({
    tenantId,
    document: String(req.params.document),
  });

  return res.status(200).json(result);
}

export async function consultarExtratoController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  requireUserRole(authReq, ['admin', 'operador'], 'Acesso negado.');
  const tenantId = requireTenantId(authReq);
  const service = new ClientesService(new ClientesRepository(authReq));

  const result = await service.consultarExtrato({
    tenantId,
    document: String(req.params.document),
    limit: parseInt((req.query.limit as string) || '100', 10),
  });

  return res.status(200).json(result);
}

export async function cadastrarClienteController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  requireUserRole(authReq, ['admin', 'operador'], 'Acesso negado.');
  const tenantId = requireTenantId(authReq);
  const { nome, document, lgpd_consentimento } = req.body;

  const cliente = await withRlsTransaction(authReq, async (client) => {
    const service = new ClientesService(new ClientesRepository(authReq, client));
    return service.cadastrarCliente({
      tenantId,
      nome,
      document,
      lgpdConsentimento: lgpd_consentimento,
    });
  });

  return res.status(201).json({
    message: 'Cadastro realizado com sucesso!',
    cliente,
  });
}
