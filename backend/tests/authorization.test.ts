import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from '../src/shared/errors/http-error';
import { requireUserRole } from '../src/shared/request-context';
import { dashboardStatsController } from '../src/modules/dashboard/dashboard.controller';
import { criarRecompensaController } from '../src/modules/recompensas/recompensas.controller';

const makeReq = (role: string) => ({
  headers: {},
  socket: {},
  user: {
    id: 'auth-user-1',
    tenant_id: 'tenant-1',
    role,
  },
  usuario: {
    id: 'tenant-user-1',
    user_id: 'auth-user-1',
    nome: 'Usuario Teste',
    email: 'usuario@example.com',
    role,
    tenant_id: 'tenant-1',
  },
  body: {},
  params: {},
  query: {},
}) as any;

const makeRes = () => ({
  statusCode: 200,
  body: undefined as unknown,
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(payload: unknown) {
    this.body = payload;
    return this;
  },
}) as any;

test('requireUserRole bloqueia roles fora da lista permitida', () => {
  assert.throws(
    () => requireUserRole(makeReq('operador'), ['admin']),
    (error) => error instanceof HttpError && error.statusCode === 403,
  );
});

test('dashboardStatsController bloqueia operador antes de consultar dados', async () => {
  await assert.rejects(
    () => dashboardStatsController(makeReq('operador'), makeRes()),
    (error) =>
      error instanceof HttpError &&
      error.statusCode === 403 &&
      error.message === 'Acesso negado. Apenas administradores podem acessar o dashboard.',
  );
});

test('criarRecompensaController bloqueia operador antes de alterar catalogo', async () => {
  const req = makeReq('operador');
  req.body = { nome: 'Cafe', custo_pontos: 50 };

  await assert.rejects(
    () => criarRecompensaController(req, makeRes()),
    (error) =>
      error instanceof HttpError &&
      error.statusCode === 403 &&
      error.message === 'Acesso negado. Apenas administradores podem gerenciar recompensas.',
  );
});

test('requireUserRole permite operador em endpoint operacional', () => {
  const role = requireUserRole(makeReq('operador'), ['admin', 'operador']);

  assert.equal(role, 'operador');
});
