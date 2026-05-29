import { AuthenticatedRequest } from '../infra/database/db-rls';

export const TENANT_NOT_FOUND_ERROR = 'Tenant do usuário não identificado.';

export const getTenantId = (req: AuthenticatedRequest): string | null => {
  return req.user?.tenant_id || req.usuario?.tenant_id || null;
};
