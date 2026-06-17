import { Router } from 'express';
import verificaToken from '../../shared/middlewares/autenticacao';
import { usuarioAtualController } from './usuarios.controller';

const router = Router();

// GET /usuarios/me - Retorna dados atuais do usuario autenticado
router.get('/me', verificaToken, usuarioAtualController);

export default router;
