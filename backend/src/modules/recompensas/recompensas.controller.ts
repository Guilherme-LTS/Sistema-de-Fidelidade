import { Request, Response } from 'express';
import { adminPool } from '../../infra/database/db';
import { AuthenticatedRequest, withRlsTransaction, queryPublicWithRLS } from '../../infra/database/db-rls';
import { requireTenantId, requireUserRole } from '../../shared/request-context';
import { RecompensasRepository } from './recompensas.repository';
import { RecompensasService } from './recompensas.service';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function makeService(authReq: AuthenticatedRequest) {
  return new RecompensasService(new RecompensasRepository(authReq));
}

export async function listarRecompensasController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  requireUserRole(authReq, ['admin', 'operador'], 'Acesso negado.');
  const tenantId = requireTenantId(authReq);
  const rewards = await makeService(authReq).listarAtivas(tenantId);

  return res.status(200).json(rewards);
}

export async function listarRecompensasPublicasController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  requireUserRole(authReq, ['admin', 'operador'], 'Acesso negado.');
  const tenantId = requireTenantId(authReq);
  const rewards = await makeService(authReq).listarPublicas(tenantId);

  return res.status(200).json(rewards);
}

export async function listarRecompensasPublicasPorTenantController(req: Request, res: Response) {
  const tenantId = String(req.params.tenant_id || '').trim();

  if (!tenantId) {
    return res.status(400).json({ error: 'tenant_id e obrigatorio.' });
  }

  if (!isUuid(tenantId)) {
    return res.status(400).json({ error: 'tenant_id invalido.' });
  }

  const { rows } = await queryPublicWithRLS(
    tenantId,
    `
      SELECT r.id, r.name, r.description, r.points_cost
      FROM rewards r
      INNER JOIN tenants t ON t.id = r.tenant_id
      WHERE r.tenant_id = $1
        AND r.is_active = true
        AND t.is_active = true
      ORDER BY r.points_cost ASC
    `,
    [tenantId],
  );

  return res.status(200).json({ rewards: rows });
}

export async function criarRecompensaController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  requireUserRole(authReq, ['admin'], 'Acesso negado. Apenas administradores podem gerenciar recompensas.');
  const tenantId = requireTenantId(authReq);
  const nome = req.body.nome ?? req.body.name;
  const descricao = req.body.descricao ?? req.body.description;
  const custoPontos = req.body.custo_pontos ?? req.body.points_cost;

  const recompensa = await withRlsTransaction(authReq, (client) => {
    const service = new RecompensasService(new RecompensasRepository(authReq, client));
    return service.criar({
      tenantId,
      nome,
      descricao,
      custoPontos,
      operatorId: authReq.usuario?.id,
      req,
    });
  });

  return res.status(201).json(recompensa);
}

export async function atualizarRecompensaController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  requireUserRole(authReq, ['admin'], 'Acesso negado. Apenas administradores podem gerenciar recompensas.');
  const tenantId = requireTenantId(authReq);
  const nome = req.body.nome ?? req.body.name;
  const descricao = req.body.descricao ?? req.body.description;
  const custoPontos = req.body.custo_pontos ?? req.body.points_cost;

  const recompensa = await withRlsTransaction(authReq, (client) => {
    const service = new RecompensasService(new RecompensasRepository(authReq, client));
    return service.atualizar({
      id: String(req.params.id),
      tenantId,
      nome,
      descricao,
      custoPontos,
      operatorId: authReq.usuario?.id,
      req,
    });
  });

  return res.status(200).json(recompensa);
}

export async function desativarRecompensaController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  requireUserRole(authReq, ['admin'], 'Acesso negado. Apenas administradores podem gerenciar recompensas.');
  const tenantId = requireTenantId(authReq);

  const result = await withRlsTransaction(authReq, (client) => {
    const service = new RecompensasService(new RecompensasRepository(authReq, client));
    return service.desativar({
      id: String(req.params.id),
      tenantId,
      operatorId: authReq.usuario?.id,
      req,
    });
  });

  return res.status(200).json(result);
}
