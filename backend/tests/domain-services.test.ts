import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TransacoesService } from '../src/modules/transacoes/transacoes.service';
import { ResgatesService } from '../src/modules/resgates/resgates.service';
import { ClientesService } from '../src/modules/clientes/clientes.service';
import { RecompensasService } from '../src/modules/recompensas/recompensas.service';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { UsuariosService } from '../src/modules/usuarios/usuarios.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { AdminUsersService } from '../src/modules/admin/admin.users.service';
import { HttpError } from '../src/shared/errors/http-error';

const mockReq = { headers: {}, socket: {} } as any;

test('TransacoesService rejeita CPF invalido antes de gravar dados', async () => {
  const calls: string[] = [];
  const service = new TransacoesService({
    loadPointSettings: async () => {
      calls.push('loadPointSettings');
      return { carencia_pontos: 0, expiracao_pontos: 180 };
    },
  } as any);

  await assert.rejects(
    () => service.lancarPontos({
      document: '11111111111',
      valor: 100,
      tenantId: 'tenant-1',
      operadorId: 'operator-1',
      req: mockReq,
    }),
    (error) => error instanceof HttpError && error.statusCode === 400 && error.message === 'CPF invÃ¡lido.',
  );

  assert.deepEqual(calls, []);
});

test('TransacoesService calcula pontos, cria cliente/transacao e registra auditoria', async () => {
  const calls: string[] = [];
  const service = new TransacoesService({
    loadPointSettings: async () => {
      calls.push('loadPointSettings');
      return { carencia_pontos: 0, expiracao_pontos: 180 };
    },
    upsertCustomer: async (input: any) => {
      calls.push(`upsertCustomer:${input.document}`);
      return { id: 'customer-1', name: 'Cliente Teste' };
    },
    createPointsTransaction: async (input: any) => {
      calls.push(`createPointsTransaction:${input.pointsEarned}`);
      assert.equal(input.amountSpent, 100.75);
      assert.equal(input.tenantId, 'tenant-1');
      return { id: 'transaction-1' };
    },
    withSavepoint: async (_name: string, handler: () => Promise<void>) => {
      calls.push('withSavepoint');
      await handler();
    },
    logPointsCreated: async (input: any) => {
      calls.push(`logPointsCreated:${input.pointsEarned}`);
      assert.equal(input.transactionId, 'transaction-1');
    },
  } as any);

  const result = await service.lancarPontos({
    document: '529.982.247-25',
    valor: 100.75,
    tenantId: 'tenant-1',
    operadorId: 'operator-1',
    req: mockReq,
  });

  assert.equal(result.pontosGanhos, 100);
  assert.deepEqual(calls, [
    'loadPointSettings',
    'upsertCustomer:52998224725',
    'createPointsTransaction:100',
    'withSavepoint',
    'logPointsCreated:100',
  ]);
});

test('ResgatesService bloqueia resgate com saldo insuficiente', async () => {
  const service = new ResgatesService({
    findCustomerByDocument: async () => ({ id: 'customer-1' }),
    findActiveReward: async () => ({ points_cost: 50, name: 'Café' }),
    lockAvailableTransactions: async () => [{ id: 1, remaining_points: 20 }],
  } as any);

  await assert.rejects(
    () => service.resgatarRecompensa({
      document: '52998224725',
      recompensaId: 'reward-1',
      tenantId: 'tenant-1',
      operadorId: 'operator-1',
      req: mockReq,
    }),
    (error) => error instanceof HttpError && error.statusCode === 409 && error.message === 'Pontos disponÃ­veis insuficientes.',
  );
});

test('ResgatesService aplica FIFO e registra resgate', async () => {
  const calls: string[] = [];
  const service = new ResgatesService({
    findCustomerByDocument: async () => {
      calls.push('findCustomerByDocument');
      return { id: 'customer-1' };
    },
    findActiveReward: async () => {
      calls.push('findActiveReward');
      return { points_cost: 60, name: 'Café' };
    },
    lockAvailableTransactions: async () => {
      calls.push('lockAvailableTransactions');
      return [
        { id: 1, remaining_points: 50 },
        { id: 2, remaining_points: 30 },
      ];
    },
    applyFifoDebits: async (updates: any[]) => {
      calls.push(`applyFifoDebits:${JSON.stringify(updates)}`);
    },
    createRedemption: async (input: any) => {
      calls.push(`createRedemption:${input.pointsSpent}`);
      return { id: 'redemption-1' };
    },
    logRewardRedeemed: async (input: any) => {
      calls.push(`logRewardRedeemed:${input.pointsSpent}`);
      assert.equal(input.redemptionId, 'redemption-1');
    },
  } as any);

  const result = await service.resgatarRecompensa({
    document: '52998224725',
    recompensaId: 'reward-1',
    tenantId: 'tenant-1',
    operadorId: 'operator-1',
    req: mockReq,
  });

  assert.equal(result.pontosRestantes, 20);
  assert.deepEqual(calls, [
    'findCustomerByDocument',
    'findActiveReward',
    'lockAvailableTransactions',
    'applyFifoDebits:[{"id":1,"descontar":50},{"id":2,"descontar":10}]',
    'createRedemption:60',
    'logRewardRedeemed:60',
  ]);
});

test('ClientesService exige consentimento LGPD no cadastro', async () => {
  const service = new ClientesService({} as any);

  await assert.rejects(
    () => service.cadastrarCliente({
      tenantId: 'tenant-1',
      nome: 'Cliente Teste',
      document: '52998224725',
      lgpdConsentimento: false,
    }),
    (error) => error instanceof HttpError && error.statusCode === 400,
  );
});

test('ClientesService consulta saldo com resumo financeiro', async () => {
  const service = new ClientesService({
    findByDocument: async (_tenantId: string, document: string) => ({
      id: 'customer-1',
      name: 'Cliente Teste',
      document,
    }),
    getFinancialSummary: async () => ({
      pontosDisponiveis: 80,
      pontosPendentes: 20,
      proximoVencimento: null,
      pontosExpirando: 0,
      dataProximaExpiracao: null,
      dataProximaLiberacao: null,
    }),
  } as any);

  const result = await service.consultarSaldo({
    tenantId: 'tenant-1',
    document: '529.982.247-25',
  });

  assert.equal(result.nome, 'Cliente Teste');
  assert.equal(result.document, '52998224725');
  assert.equal(result.pontosDisponiveis, 80);
});

test('RecompensasService valida nome e custo obrigatorios', async () => {
  const service = new RecompensasService({} as any);

  await assert.rejects(
    () => service.criar({
      tenantId: 'tenant-1',
      nome: '',
      custoPontos: 100,
      req: mockReq,
    }),
    (error) => error instanceof HttpError && error.statusCode === 400,
  );
});

test('RecompensasService cria recompensa e registra auditoria', async () => {
  const calls: string[] = [];
  const service = new RecompensasService({
    create: async (input: any) => {
      calls.push(`create:${input.pointsCost}`);
      return { id: 'reward-1', name: input.name, points_cost: input.pointsCost };
    },
    logRewardEvent: async (input: any) => {
      calls.push(`logRewardEvent:${input.rewardId}`);
    },
  } as any);

  const result = await service.criar({
    tenantId: 'tenant-1',
    nome: 'Cafe gratis',
    descricao: 'Uma bebida',
    custoPontos: '150',
    operatorId: 'operator-1',
    req: mockReq,
  });

  assert.equal(result.id, 'reward-1');
  assert.deepEqual(calls, ['create:150', 'logRewardEvent:reward-1']);
});

test('DashboardService monta payload consolidado de metricas', async () => {
  const service = new DashboardService({
    getMetrics: async () => ({
      total_clientes: '4',
      pontos_pendentes: '10',
      pontos_disponiveis: '90',
      pontos_resgatados: '30',
    }),
    getTopClients: async () => [{ id: 'customer-1', name: 'Cliente Teste' }],
    getSevenDayChartRows: async () => [],
  } as any);

  const result = await service.getStats('tenant-1');

  assert.equal(result.totalClientes, 4);
  assert.equal(result.pontosDisponiveis, 90);
  assert.deepEqual(result.recentes, [{ id: 'customer-1', name: 'Cliente Teste' }]);
  assert.ok(Array.isArray(result.chartData));
});

test('UsuariosService retorna usuario autenticado atual', () => {
  const service = new UsuariosService();
  const usuario = { id: 'user-1', nome: 'Admin', role: 'admin', tenant_id: 'tenant-1' };

  assert.equal(service.getCurrentUser({ usuario } as any), usuario);
});

test('AuthService exige campos obrigatorios no cadastro de tenant', async () => {
  const service = new AuthService({} as any);

  await assert.rejects(
    () => service.registerTenant({
      tenantName: '',
      email: 'admin@example.com',
      password: 'secret',
    }),
    (error) => error instanceof HttpError && error.statusCode === 400,
  );
});

test('AuthService cria tenant, admin, settings e metadata com dados normalizados', async () => {
  const calls: string[] = [];
  const service = new AuthService({
    createAuthUser: async (input: any) => {
      calls.push(`createAuthUser:${input.email}`);
      assert.equal(input.password, 'senha123');
      return { id: 'auth-user-1' };
    },
    createTenant: async (input: any) => {
      calls.push(`createTenant:${input.tenantName}:${input.document}`);
      assert.equal(input.tenantId, 'auth-user-1');
    },
    createTenantAdmin: async (input: any) => {
      calls.push(`createTenantAdmin:${input.adminName}`);
      assert.equal(input.userId, 'auth-user-1');
      assert.equal(input.tenantId, 'auth-user-1');
    },
    seedTenantSettings: async (input: any) => {
      calls.push(`seedTenantSettings:${input.carenciaPontos}:${input.expiracaoPontos}`);
      assert.equal(input.tenantId, 'auth-user-1');
    },
    updateAuthUserMetadata: async (input: any) => {
      calls.push(`updateAuthUserMetadata:${input.role}`);
      assert.equal(input.userId, 'auth-user-1');
      assert.equal(input.tenantId, 'auth-user-1');
    },
    deleteAuthUser: async () => {
      calls.push('deleteAuthUser');
    },
  } as any);

  const result = await service.registerTenant({
    tenantName: ' Restaurante Teste ',
    adminName: ' Admin Teste ',
    email: 'ADMIN@EXAMPLE.COM ',
    password: 'senha123',
    document: '12.345.678/0001-90',
  });

  assert.equal(result.tenant_id, 'auth-user-1');
  assert.deepEqual(calls, [
    'createAuthUser:admin@example.com',
    'createTenant:Restaurante Teste:12345678000190',
    'createTenantAdmin:Admin Teste',
    'seedTenantSettings:0:180',
    'updateAuthUserMetadata:admin',
  ]);
});

test('AuthService remove usuario auth quando banco falha no cadastro de tenant', async () => {
  const calls: string[] = [];
  const service = new AuthService({
    createAuthUser: async () => {
      calls.push('createAuthUser');
      return { id: 'auth-user-1' };
    },
    createTenant: async () => {
      calls.push('createTenant');
      const error: any = new Error('duplicado');
      error.code = '23505';
      throw error;
    },
    deleteAuthUser: async (userId: string) => {
      calls.push(`deleteAuthUser:${userId}`);
    },
  } as any);

  await assert.rejects(
    () =>
      service.registerTenant({
        tenantName: 'Restaurante Teste',
        email: 'admin@example.com',
        password: 'senha123',
      }),
    (error) => error instanceof HttpError && error.statusCode === 409,
  );

  assert.deepEqual(calls, ['createAuthUser', 'createTenant', 'deleteAuthUser:auth-user-1']);
});

test('AdminUsersService valida role ao criar usuario interno', async () => {
  const service = new AdminUsersService({} as any);

  await assert.rejects(
    () => service.criarUsuario({
      tenantId: 'tenant-1',
      nome: 'Operador',
      role: 'gerente',
    }),
    (error) => error instanceof HttpError && error.statusCode === 400 && error.message === 'Role invalida.',
  );
});

test('AdminUsersService cria usuario de autenticacao e vinculo no tenant', async () => {
  const calls: string[] = [];
  const service = new AdminUsersService(
    {
      createStaff: async (input: any) => {
        calls.push(`createStaff:${input.userId}:${input.role}`);
        assert.equal(input.tenantId, 'tenant-1');
        assert.equal(input.nome, 'Operador');
        return {
          id: 'tenant-user-1',
          user_id: input.userId,
          name: input.nome,
          role: input.role,
          is_active: true,
        };
      },
    } as any,
    {
      auth: {
        admin: {
          createUser: async (input: any) => {
            calls.push(`createUser:${input.email}:${input.app_metadata.role}`);
            assert.equal(input.password, 'senha123');
            assert.equal(input.app_metadata.tenant_id, 'tenant-1');
            return { data: { user: { id: 'auth-user-1' } }, error: null };
          },
          deleteUser: async () => {
            calls.push('deleteUser');
            return { data: {}, error: null };
          },
        },
      },
    } as any,
  );

  const result = await service.criarUsuario({
    tenantId: 'tenant-1',
    nome: 'Operador',
    email: 'operador@example.com',
    role: 'operador',
    senha: 'senha123',
  });

  assert.equal(result?.usuario.supabase_id, 'auth-user-1');
  assert.deepEqual(calls, ['createUser:operador@example.com:operador', 'createStaff:auth-user-1:operador']);
});
