import { AuthenticatedRequest, queryWithRLS } from '../../infra/database/db-rls';
import {
  QUERY_DASHBOARD_CHART_7DAYS,
  QUERY_DASHBOARD_METRICS,
  QUERY_DASHBOARD_TOP_CLIENTS,
} from '../../shared/query-builders/dashboard';

export class DashboardRepository {
  constructor(private readonly authReq: AuthenticatedRequest) {}

  async getMetrics(tenantId: string) {
    const result = await queryWithRLS(this.authReq, QUERY_DASHBOARD_METRICS(), [tenantId]);
    return result.rows[0] || {};
  }

  async getTopClients(tenantId: string) {
    const result = await queryWithRLS(this.authReq, QUERY_DASHBOARD_TOP_CLIENTS(), [tenantId]);
    return result.rows;
  }

  async getSevenDayChartRows(tenantId: string) {
    const result = await queryWithRLS(this.authReq, QUERY_DASHBOARD_CHART_7DAYS(), [tenantId]);
    return result.rows;
  }
}
