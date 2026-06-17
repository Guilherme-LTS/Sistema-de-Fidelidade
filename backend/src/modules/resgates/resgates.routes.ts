import { Router } from 'express';
import verificaToken from '../../shared/middlewares/autenticacao';
import { resgatarRecompensaController } from './resgates.controller';

const router = Router();

// POST /redemptions - Resgatar recompensa
router.post('/', verificaToken, resgatarRecompensaController);

export default router;
