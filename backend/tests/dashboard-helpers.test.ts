import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardChartData } from '../src/shared/query-builders/dashboard';

test('buildDashboardChartData maps values and preserves legacy alias', () => {
  const rows = [
    {
      dia: new Date(2025, 0, 5, 12, 0, 0),
      pendentes: '5',
      lancados: '10',
      redemptions: '2',
    },
  ];

  const result = buildDashboardChartData(rows);

  assert.equal(result.length, 1);
  assert.equal(result[0].pendentes, 5);
  assert.equal(result[0].lancados, 10);
  assert.equal(result[0].disponiveis, 10);
  assert.equal(result[0].redemptions, 2);
  assert.equal(result[0].name, 'Dom');
});
