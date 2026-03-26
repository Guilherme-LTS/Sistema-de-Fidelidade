import { Router, Request, Response } from 'express';
import verificaToken from '../../shared/middlewares/autenticacao';

const router = Router();

// GET /usuarios/me - Retorna dados atuais do usuario autenticado
router.get('/me', verificaToken, (req: any, res: Response) => {
  res.status(200).json(req.usuario);
});

export default router;
