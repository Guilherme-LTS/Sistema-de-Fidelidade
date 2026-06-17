import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchAuditReport } from '../src/shared/auditoria/audit-queries';

test('fetchAuditReport returns audit data when table exists', async () => {
  let callIndex = 0;
  const queryExecutor = async () => {
    callIndex += 1;
    if (callIndex === 1) {
      return { rows: [{ count: 2 }] };
    }
    if (callIndex === 2) {
      return { rows: [{ count: 1 }] };
    }
    if (callIndex === 3) {
      return { rows: [{ id: '1', acao: 'LANCAMENTO_PONTOS' }] };
    }
    if (callIndex === 4) {
      return { rows: [{ total: 1, lancamentos: 1, resgates: 0, configuracoes: 0, falhas: 0 }] };
    }
    throw new Error('Unexpected query call');
  };

  const report = await fetchAuditReport(
    {} as any,
    'tenant-1',
    { searchText: '', eventType: '', status: '', startDate: null, endDate: null },
    { page: 1, limit: 10 },
    queryExecutor,
  );

  assert.equal(report.data.length, 1);
  assert.equal(report.summary.total, 1);
  assert.equal(report.summary.lancamentos, 1);
  assert.equal(report.pagination.total, 1);
});

test('fetchAuditReport falls back to legacy data when audit table is missing', async () => {
  let callIndex = 0;
  const queryExecutor = async () => {
    callIndex += 1;
    if (callIndex === 1) {
      const error = new Error('missing table') as Error & { code?: string };
      error.code = '42P01';
      throw error;
    }
    if (callIndex === 2) {
      return { rows: [
        { acao: 'LANCAMENTO_PONTOS' },
        { acao: 'RESGATE_RECOMPENSA' },
      ] };
    }
    if (callIndex === 3) {
      return { rows: [{ count: 2 }] };
    }
    throw new Error('Unexpected query call');
  };

  const report = await fetchAuditReport(
    {} as any,
    'tenant-1',
    { searchText: '', eventType: '', status: '', startDate: null, endDate: null },
    { page: 1, limit: 10 },
    queryExecutor,
  );

  assert.equal(report.data.length, 2);
  assert.equal(report.summary.total, 2);
  assert.equal(report.summary.lancamentos, 1);
  assert.equal(report.summary.resgates, 1);
  assert.equal(report.pagination.total, 2);
});

test('fetchAuditReport returns empty when status filter is FALHA and audit table is missing', async () => {
  let calls = 0;
  const queryExecutor = async () => {
    calls += 1;
    const error = new Error('missing table') as Error & { code?: string };
    error.code = '42P01';
    throw error;
  };

  const report = await fetchAuditReport(
    {} as any,
    'tenant-1',
    { searchText: '', eventType: '', status: 'FALHA', startDate: null, endDate: null },
    { page: 1, limit: 10 },
    queryExecutor,
  );

  assert.equal(calls, 1);
  assert.equal(report.data.length, 0);
  assert.equal(report.summary.total, 0);
  assert.equal(report.pagination.total, 0);
});
