import { Router } from 'express';
import verificaToken from '../../shared/middlewares/autenticacao';
import {
  atualizarRecompensaController,
  criarRecompensaController,
  desativarRecompensaController,
  listarRecompensasController,
  listarRecompensasPublicasController,
  listarRecompensasPublicasPorTenantController,
} from './recompensas.controller';

const router = Router();

// GET /rewards/publica/:tenant_id - Listar rewards publicas sem autenticacao
router.get('/publica/:tenant_id', listarRecompensasPublicasPorTenantController);

// GET /rewards - Listar todas as rewards
router.get('/', verificaToken, listarRecompensasController);

// GET /rewards/publica - Listar rewards publicas
router.get('/publica', verificaToken, listarRecompensasPublicasController);

// POST /rewards - Criar nova recompensa
router.post('/', verificaToken, criarRecompensaController);

// PUT /rewards/:id - Atualizar recompensa
router.put('/:id', verificaToken, atualizarRecompensaController);

// DELETE /rewards/:id - Desativar recompensa
router.delete('/:id', verificaToken, desativarRecompensaController);

export default router;
