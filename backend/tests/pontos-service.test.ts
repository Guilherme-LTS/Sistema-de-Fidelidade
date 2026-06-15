import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePointTimelines,
  buildFifoDebitUpdates,
  buildFifoUpdateQuery,
} from '../src/shared/pontos/pontos-service';

test('calculatePointTimelines uses base date offsets', () => {
  const baseDate = new Date('2025-01-01T00:00:00.000Z');
  const { availableAt, expiresAt } = calculatePointTimelines(2, 10, baseDate);

  const expectedAvailable = new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000);
  const expectedExpires = new Date(expectedAvailable.getTime() + 10 * 24 * 60 * 60 * 1000);

  assert.equal(availableAt.getTime(), expectedAvailable.getTime());
  assert.equal(expiresAt.getTime(), expectedExpires.getTime());
});

test('calculatePointTimelines uses APP_FAKE_NOW outside production', () => {
  const previousFakeNow = process.env.APP_FAKE_NOW;
  const previousNodeEnv = process.env.NODE_ENV;

  process.env.NODE_ENV = 'test';
  process.env.APP_FAKE_NOW = '2025-03-10T12:00:00.000Z';

  try {
    const { availableAt, expiresAt } = calculatePointTimelines(1, 5);
    assert.equal(availableAt.toISOString(), '2025-03-11T12:00:00.000Z');
    assert.equal(expiresAt.toISOString(), '2025-03-16T12:00:00.000Z');
  } finally {
    if (previousFakeNow === undefined) {
      delete process.env.APP_FAKE_NOW;
    } else {
      process.env.APP_FAKE_NOW = previousFakeNow;
    }

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});

test('buildFifoDebitUpdates calculates FIFO debits and remaining points', () => {
  const transactions = [
    { id: 1, remaining_points: 50 },
    { id: 2, remaining_points: 30 },
  ];

  const result = buildFifoDebitUpdates(transactions, 60);

  assert.deepEqual(result.updates, [
    { id: 1, descontar: 50 },
    { id: 2, descontar: 10 },
  ]);
  assert.equal(result.pontosRestantes, 20);
});

test('buildFifoUpdateQuery builds CASE clause and ids', () => {
  const updates = [
    { id: 1, descontar: 50 },
    { id: 2, descontar: 10 },
  ];

  const result = buildFifoUpdateQuery(updates);

  assert.deepEqual(result.ids, [1, 2]);
  assert.equal(
    result.caseClause,
    'CASE id\nWHEN 1 THEN remaining_points - 50\nWHEN 2 THEN remaining_points - 10\nELSE remaining_points\nEND',
  );
});
