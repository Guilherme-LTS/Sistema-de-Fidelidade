import { Router } from 'express';
import verificaToken from '../../shared/middlewares/autenticacao';
import {
  cadastrarClienteController,
  consultarExtratoController,
  consultarSaldoController,
  listarClientesController,
} from './clientes.controller';

const router = Router();

// GET /customers - Listar customers com busca e paginacao
router.get('/', verificaToken, listarClientesController);

// GET /customers/:document - Consultar saldo de pontos
router.get('/:document', verificaToken, consultarSaldoController);

// GET /customers/:document/extrato - Extrato de transacoes
router.get('/:document/extrato', verificaToken, consultarExtratoController);

// POST /customers/cadastro - Cadastrar novo cliente
router.post('/cadastro', verificaToken, cadastrarClienteController);

export default router;
