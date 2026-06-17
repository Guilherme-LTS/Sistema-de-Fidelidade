import { Response } from 'express';
import { AuthenticatedRequest } from '../../infra/database/db-rls';
import { getTenantId, TENANT_NOT_FOUND_ERROR } from '../../shared/request-context';

export function ensureAdmin(authReq: AuthenticatedRequest, res: Response, message = 'Acesso negado.'): boolean {
  const role = authReq.usuario?.role || authReq.user?.role;

  if (role !== 'admin') {
    res.status(403).json({ error: message });
    return false;
  }

  return true;
}

export function requireTenantId(authReq: AuthenticatedRequest, res: Response): string | null {
  const tenantId = getTenantId(authReq);
  if (!tenantId) {
    res.status(400).json({ error: TENANT_NOT_FOUND_ERROR });
    return null;
  }

  return tenantId;
}
