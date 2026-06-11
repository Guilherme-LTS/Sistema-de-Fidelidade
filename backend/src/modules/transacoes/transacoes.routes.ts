import { Router } from 'express';
import verificaToken from '../../shared/middlewares/autenticacao';
import { lancarPontosController } from './transacoes.controller';

const router = Router();

router.post('/', verificaToken, lancarPontosController);

export default router;
