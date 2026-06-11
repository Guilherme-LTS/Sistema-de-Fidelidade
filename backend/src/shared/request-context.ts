import { AuthenticatedRequest } from '../infra/database/db-rls';
import { HttpError } from './errors/http-error';

export const TENANT_NOT_FOUND_ERROR = 'Tenant do usuario nao identificado.';

export const getTenantId = (req: AuthenticatedRequest): string | null => {
  return req.user?.tenant_id || req.usuario?.tenant_id || null;
};

export const requireTenantId = (req: AuthenticatedRequest): string => {
  const tenantId = getTenantId(req);

  if (!tenantId) {
    throw new HttpError(400, TENANT_NOT_FOUND_ERROR);
  }

  return tenantId;
};

export const requireUserRole = (req: AuthenticatedRequest, allowedRoles: string[], message = 'Acesso negado.') => {
  const role = req.usuario?.role || req.user?.role;

  if (!role || !allowedRoles.includes(role)) {
    throw new HttpError(403, message);
  }

  return role;
};
