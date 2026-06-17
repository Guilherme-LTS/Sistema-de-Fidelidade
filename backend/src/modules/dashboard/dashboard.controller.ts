import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infra/database/db-rls';
import { requireTenantId, requireUserRole } from '../../shared/request-context';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';

export async function dashboardStatsController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  requireUserRole(authReq, ['admin'], 'Acesso negado. Apenas administradores podem acessar o dashboard.');
  const tenantId = requireTenantId(authReq);
  const service = new DashboardService(new DashboardRepository(authReq));
  const stats = await service.getStats(tenantId);

  return res.status(200).json(stats);
}
