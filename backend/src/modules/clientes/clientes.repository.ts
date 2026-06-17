import { PoolClient } from 'pg';
import { AuthenticatedRequest } from '../../infra/database/db-rls';
import {
  findCustomerByDocument,
  getCustomerFinancialSummary,
  getCustomerStatement,
  listCustomers,
} from '../../shared/customers/customer-queries';
import { upsertTenantCustomerByDocument } from '../../shared/customers/customer-identity';

export class ClientesRepository {
  constructor(
    private readonly authReq: AuthenticatedRequest,
    private readonly client?: PoolClient,
  ) {}

  async list(input: { busca?: string; page: number; limit: number; tenantId: string }) {
    return listCustomers(this.authReq, input);
  }

  async findByDocument(tenantId: string, document: string) {
    return findCustomerByDocument(this.authReq, tenantId, document);
  }

  async getFinancialSummary(tenantId: string, customerId: string) {
    return getCustomerFinancialSummary(this.authReq, tenantId, customerId);
  }

  async getStatement(tenantId: string, customerId: string, limit: number) {
    return getCustomerStatement(this.authReq, tenantId, customerId, limit);
  }

  async upsertCustomer(input: {
    tenantId: string;
    document: string;
    name: string;
    lgpdConsent: boolean;
    consentDate: Date;
  }) {
    if (!this.client) {
      throw new Error('Cliente de banco necessario para cadastrar cliente.');
    }

    return upsertTenantCustomerByDocument(this.client, {
      tenantId: input.tenantId,
      document: input.document,
      name: input.name,
      lgpdConsent: input.lgpdConsent,
      consentDate: input.consentDate,
    });
  }
}
