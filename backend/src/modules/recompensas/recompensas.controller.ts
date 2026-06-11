import { Request, Response } from 'express';
import { AuthenticatedRequest, withRlsTransaction } from '../../infra/database/db-rls';
import { requireTenantId } from '../../shared/request-context';
import { RecompensasRepository } from './recompensas.repository';
import { RecompensasService } from './recompensas.service';

function makeService(authReq: AuthenticatedRequest) {
  return new RecompensasService(new RecompensasRepository(authReq));
}

export async function listarRecompensasController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = requireTenantId(authReq);
  const rewards = await makeService(authReq).listarAtivas(tenantId);

  return res.status(200).json(rewards);
}

export async function listarRecompensasPublicasController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = requireTenantId(authReq);
  const rewards = await makeService(authReq).listarPublicas(tenantId);

  return res.status(200).json(rewards);
}

export async function criarRecompensaController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
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
