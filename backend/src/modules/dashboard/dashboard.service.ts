import { db } from "../../infra/database/db.js";
import { 
  customers, 
  transactions, 
  redemptions, 
  rewards, 
  auditLogs,
  expirations,
  tenants
} from "../../infra/database/schema.js";
import { eq, sql, and, desc, gte } from "drizzle-orm";

export class DashboardService {
  async getDashboardStats(tenantId: string, periodDays: number = 30) {
    const now = new Date();
    
    // Datas atuais (Current Period)
    const currentPeriodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const currentPeriodStartIso = currentPeriodStart.toISOString();
    const nowIso = now.toISOString();

    // Datas anteriores (Previous Period para calcular % de crescimento)
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStartIso = previousPeriodStart.toISOString();

    // 1. Clientes
    const [{ count: totalClientes }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), sql`deleted_at IS NULL`));

    // Novos clientes no período atual
    const [{ count: novosClientesAtual }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          sql`deleted_at IS NULL`,
          gte(customers.createdAt, currentPeriodStartIso)
        )
      );

    // Novos clientes no período anterior
    const [{ count: novosClientesAnterior }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          sql`deleted_at IS NULL`,
          sql`created_at >= ${previousPeriodStartIso} AND created_at < ${currentPeriodStartIso}`
        )
      );

    // 2. Pontos Emitidos (Atual vs Anterior)
    const emitidosAtualRaw = await db.execute(sql`
      SELECT COALESCE(SUM(points_earned), 0)::int as total
      FROM transactions
      WHERE tenant_id = ${tenantId} AND created_at >= ${currentPeriodStartIso}
    `);
    const emitidosAtual = Number(emitidosAtualRaw.rows[0]?.total || 0);

    const emitidosAnteriorRaw = await db.execute(sql`
      SELECT COALESCE(SUM(points_earned), 0)::int as total
      FROM transactions
      WHERE tenant_id = ${tenantId} AND created_at >= ${previousPeriodStartIso} AND created_at < ${currentPeriodStartIso}
    `);
    const emitidosAnterior = Number(emitidosAnteriorRaw.rows[0]?.total || 0);

    // 3. Pontos Resgatados (Atual vs Anterior)
    const resgatadosAtualRaw = await db.execute(sql`
      SELECT COALESCE(SUM(points_spent), 0)::int as total, count(*)::int as count
      FROM redemptions
      WHERE tenant_id = ${tenantId} AND created_at >= ${currentPeriodStartIso}
    `);
    const resgatadosAtual = Number(resgatadosAtualRaw.rows[0]?.total || 0);
    const resgatesCountAtual = Number(resgatadosAtualRaw.rows[0]?.count || 0);

    const resgatadosAnteriorRaw = await db.execute(sql`
      SELECT COALESCE(SUM(points_spent), 0)::int as total
      FROM redemptions
      WHERE tenant_id = ${tenantId} AND created_at >= ${previousPeriodStartIso} AND created_at < ${currentPeriodStartIso}
    `);
    const resgatadosAnterior = Number(resgatadosAnteriorRaw.rows[0]?.total || 0);

    // 4. Pontos Expirados (Atual vs Anterior)
    const expiradosAtualRaw = await db.execute(sql`
      SELECT COALESCE(SUM(points_expired), 0)::int as total
      FROM expirations
      WHERE tenant_id = ${tenantId} AND created_at >= ${currentPeriodStartIso}
    `);
    const expiradosAtual = Number(expiradosAtualRaw.rows[0]?.total || 0);

    const expiradosAnteriorRaw = await db.execute(sql`
      SELECT COALESCE(SUM(points_expired), 0)::int as total
      FROM expirations
      WHERE tenant_id = ${tenantId} AND created_at >= ${previousPeriodStartIso} AND created_at < ${currentPeriodStartIso}
    `);
    const expiradosAnterior = Number(expiradosAnteriorRaw.rows[0]?.total || 0);

    // 5. Pontos Expirando nos próximos 30 dias (Alerta)
    const expirandoEmBreveRaw = await db.execute(sql`
      SELECT COALESCE(SUM(remaining_points), 0)::int as total
      FROM transactions
      WHERE tenant_id = ${tenantId} 
        AND available_at <= ${nowIso} 
        AND expires_at > ${nowIso} 
        AND expires_at <= (${nowIso}::timestamp + INTERVAL '30 days')
        AND remaining_points > 0
    `);
    const expirandoEmBreve = Number(expirandoEmBreveRaw.rows[0]?.total || 0);

    // 6. Saldo Circulante (Pontos disponiveis dos clientes, métrica global não presa ao período)
    const resultCirculante = await db.execute(sql`
      SELECT COALESCE(SUM(remaining_points), 0)::int as total
      FROM transactions
      WHERE tenant_id = ${tenantId} AND available_at <= ${nowIso} AND expires_at > ${nowIso}
    `);
    const saldoCirculante = Number(resultCirculante.rows[0]?.total || 0);

    // 7. Top Recompensas do Período
    const topRewardsRaw = await db.execute(sql`
      SELECT r.name, COUNT(red.id)::int as resgates
      FROM redemptions red
      JOIN rewards r ON red.reward_id = r.id
      WHERE red.tenant_id = ${tenantId} AND red.created_at >= ${currentPeriodStartIso}
      GROUP BY r.id, r.name
      ORDER BY resgates DESC
      LIMIT 3
    `);
    const topRewards = topRewardsRaw.rows as any[];
    const recompensaFavorita = topRewards.length > 0 ? topRewards[0].name : null;

    // 8. Top Clientes (Maior Acumulo no período)
    const topClientesRaw = await db.execute(sql`
      SELECT c.id, p.name as nome, COALESCE(SUM(t.points_earned), 0)::int as saldo
      FROM customers c
      JOIN consumer_profiles p ON c.consumer_profile_id = p.id
      JOIN transactions t ON c.id = t.customer_id
      WHERE c.tenant_id = ${tenantId} AND c.deleted_at IS NULL AND t.created_at >= ${currentPeriodStartIso}
      GROUP BY c.id, p.name
      ORDER BY saldo DESC
      LIMIT 5
    `);
    const topClientes = topClientesRaw.rows as any[];

    // 9. Atividades Recentes
    const atividades = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        createdAt: auditLogs.createdAt,
        metadata: auditLogs.metadata
      })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);

    // 10. Dados para o Gráfico (Evolução diária dentro do período)
    const chartEarned = await db.execute(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COALESCE(SUM(points_earned), 0)::int as total
      FROM transactions
      WHERE tenant_id = ${tenantId} AND created_at >= ${currentPeriodStartIso}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    `);
    
    const chartRedeemed = await db.execute(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COALESCE(SUM(points_spent), 0)::int as total
      FROM redemptions
      WHERE tenant_id = ${tenantId} AND created_at >= ${currentPeriodStartIso}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    `);

    const chartExpired = await db.execute(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COALESCE(SUM(points_expired), 0)::int as total
      FROM expirations
      WHERE tenant_id = ${tenantId} AND created_at >= ${currentPeriodStartIso}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    `);

    const chartMap = new Map<string, any>();
    // Preenche todos os dias do periodo com 0
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      chartMap.set(dateStr, { date: dateStr, emitidos: 0, resgatados: 0, expirados: 0 });
    }

    for (const row of chartEarned.rows) {
      const existing = chartMap.get(row.date as string) || { date: row.date, emitidos: 0, resgatados: 0, expirados: 0 };
      existing.emitidos = row.total;
      chartMap.set(row.date as string, existing);
    }
    for (const row of chartRedeemed.rows) {
      const existing = chartMap.get(row.date as string) || { date: row.date, emitidos: 0, resgatados: 0, expirados: 0 };
      existing.resgatados = row.total;
      chartMap.set(row.date as string, existing);
    }
    for (const row of chartExpired.rows) {
      const existing = chartMap.get(row.date as string) || { date: row.date, emitidos: 0, resgatados: 0, expirados: 0 };
      existing.expirados = row.total;
      chartMap.set(row.date as string, existing);
    }

    const chartData = Array.from(chartMap.values());

    // Verifica se a conta é nova demais para ter um período de comparação justo
    const [tenantData] = await db.select({ createdAt: tenants.createdAt }).from(tenants).where(eq(tenants.id, tenantId));
    const tenantCreatedAt = tenantData?.createdAt ? new Date(tenantData.createdAt) : new Date(0);
    const hasValidHistory = tenantCreatedAt <= previousPeriodStart;

    return {
      clientes: {
        total: totalClientes,
        novosMes: novosClientesAtual,
        crescimento: this.calculateGrowth(novosClientesAtual, novosClientesAnterior, hasValidHistory)
      },
      pontos: {
        emitidos: emitidosAtual,
        emitidosCrescimento: this.calculateGrowth(emitidosAtual, emitidosAnterior, hasValidHistory),
        resgatados: resgatadosAtual,
        resgatadosCrescimento: this.calculateGrowth(resgatadosAtual, resgatadosAnterior, hasValidHistory),
        expirados: expiradosAtual,
        expiradosCrescimento: this.calculateGrowth(expiradosAtual, expiradosAnterior, hasValidHistory),
        saldoCirculante,
        expirandoEmBreve
      },
      recompensas: {
        favorita: recompensaFavorita,
        topRecompensas: topRewards,
        resgatesMes: resgatesCountAtual
      },
      topClientes,
      atividades,
      chartData
    };
  }

  private calculateGrowth(current: number, previous: number, hasValidHistory: boolean): number | null {
    if (!hasValidHistory) return null;

    const c = Number(current) || 0;
    const p = Number(previous) || 0;
    
    if (p === 0 && c === 0) {
      return 0; // Permaneceu em 0
    }
    
    if (p === 0 && c > 0) {
      return 100; // Crescimento de 0 para um valor positivo (assumimos +100%)
    }
    
    const diff = c - p;
    const result = Number(((diff / p) * 100).toFixed(1));
    return isNaN(result) ? 0 : result;
  }
}
