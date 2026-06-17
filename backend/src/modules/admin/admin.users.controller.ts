import { Request, Response } from 'express';
import { AuthenticatedRequest, withRlsTransaction } from '../../infra/database/db-rls';
import { supabaseAdmin } from '../../shared/supabase';
import { requireTenantId, requireUserRole } from '../../shared/request-context';
import { AdminUsersRepository } from './admin.users.repository';
import { AdminUsersService } from './admin.users.service';

function makeService(authReq: AuthenticatedRequest) {
  requireUserRole(authReq, ['admin']);
  return new AdminUsersService(new AdminUsersRepository(authReq), supabaseAdmin);
}

export async function criarUsuarioAdminController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = requireTenantId(authReq);
  requireUserRole(authReq, ['admin']);
  const { email, nome, role = 'operador', senha, password } = req.body;
  const result = await withRlsTransaction(authReq, (client) => {
    const service = new AdminUsersService(new AdminUsersRepository(authReq, client), supabaseAdmin);
    return service.criarUsuario({ tenantId, email, nome, role, senha: senha ?? password });
  });

  return res.status(201).json(result);
}

export async function listarUsuariosAdminController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = requireTenantId(authReq);
  const result = await makeService(authReq).listarUsuarios(tenantId);

  return res.status(200).json(result);
}

export async function atualizarUsuarioAdminController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = requireTenantId(authReq);
  requireUserRole(authReq, ['admin']);
  const { nome, role, email } = req.body;
  const result = await withRlsTransaction(authReq, (client) => {
    const service = new AdminUsersService(new AdminUsersRepository(authReq, client), supabaseAdmin);
    return service.atualizarUsuario({
      id: String(req.params.id),
      tenantId,
      nome,
      role,
      email,
      currentTenantUserId: authReq.usuario?.id,
      currentRole: authReq.usuario?.role,
    });
  });

  return res.status(200).json(result);
}

export async function alterarStatusUsuarioAdminController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = requireTenantId(authReq);
  requireUserRole(authReq, ['admin']);
  const result = await withRlsTransaction(authReq, (client) => {
    const service = new AdminUsersService(new AdminUsersRepository(authReq, client), supabaseAdmin);
    return service.alterarStatus({
      id: String(req.params.id),
      tenantId,
      ativo: req.body.ativo,
      currentTenantUserId: authReq.usuario?.id,
    });
  });

  return res.status(200).json(result);
}

export async function excluirUsuarioAdminController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = requireTenantId(authReq);
  requireUserRole(authReq, ['admin']);
  const result = await withRlsTransaction(authReq, (client) => {
    const service = new AdminUsersService(new AdminUsersRepository(authReq, client), supabaseAdmin);
    return service.excluirUsuario({
      id: String(req.params.id),
      tenantId,
      currentTenantUserId: authReq.usuario?.id,
    });
  });

  return res.status(200).json(result);
}
