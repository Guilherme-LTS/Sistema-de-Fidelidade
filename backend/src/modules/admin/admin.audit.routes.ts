import { Request, Response, Router } from 'express';
import { AuthenticatedRequest } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';
import { fetchAuditReport } from '../../shared/auditoria/audit-queries';
import { ensureAdmin, requireTenantId } from './admin.guard';

const router = Router();

router.get('/auditoria', verificaToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (!ensureAdmin(authReq, res, 'Acesso negado. Apenas administradores.')) {
    return;
  }

  const tenantId = requireTenantId(authReq, res);
  if (!tenantId) {
    return;
  }

  const { page = 1, limit = 50, q = '', startDate, endDate, eventType = '', status = '' } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  const searchText = String(q || '').trim();
  const eventTypeFilter = String(eventType || '').trim();
  const statusFilter = String(status || '').trim().toUpperCase();
  const parsedStartDate = startDate ? new Date(String(startDate)) : null;
  const parsedEndDate = endDate ? new Date(String(endDate)) : null;

  if (parsedStartDate && Number.isNaN(parsedStartDate.getTime())) {
    return res.status(400).json({ error: 'startDate inválida.' });
  }
  if (parsedEndDate && Number.isNaN(parsedEndDate.getTime())) {
    return res.status(400).json({ error: 'endDate inválida.' });
  }

  try {
    const report = await fetchAuditReport(
      authReq,
      tenantId,
      {
        searchText,
        eventType: eventTypeFilter,
        status: statusFilter,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      },
      {
        page: safePage,
        limit: safeLimit,
      },
    );

    return res.status(200).json(report);
  } catch (error) {
    console.error('Erro ao buscar auditoria:', error);
    return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

export default router;