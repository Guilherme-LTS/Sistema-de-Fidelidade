import { Router } from 'express';
import verificaToken from '../../shared/middlewares/autenticacao';
import { dashboardStatsController } from './dashboard.controller';

const router = Router();

// GET /dashboard/stats - Estatisticas do dashboard
router.get('/stats', verificaToken, dashboardStatsController);

export default router;
