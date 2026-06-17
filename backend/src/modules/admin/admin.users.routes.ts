import { Router } from 'express';
import verificaToken from '../../shared/middlewares/autenticacao';
import {
  alterarStatusUsuarioAdminController,
  atualizarUsuarioAdminController,
  criarUsuarioAdminController,
  excluirUsuarioAdminController,
  listarUsuariosAdminController,
} from './admin.users.controller';

const router = Router();

router.post('/usuarios', verificaToken, criarUsuarioAdminController);
router.get('/usuarios', verificaToken, listarUsuariosAdminController);
router.put('/usuarios/:id', verificaToken, atualizarUsuarioAdminController);
router.patch('/usuarios/:id/status', verificaToken, alterarStatusUsuarioAdminController);
router.delete('/usuarios/:id', verificaToken, excluirUsuarioAdminController);

export default router;
