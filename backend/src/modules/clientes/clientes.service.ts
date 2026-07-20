import { eq, and, or, ilike, desc, count, sql } from "drizzle-orm";
import { db } from "../../infra/database/db.js";
import { customers, consumerProfiles, tenants } from "../../infra/database/schema.js";
import { validateAndCleanCPF } from "../../shared/validators/cpf.js";
import { AppError, NotFoundError } from "../../shared/errors/app-error.js";
import { logAuditEvent } from "../../shared/audit.service.js";
import { planLimitService } from "../billing/plan-limit.service.js";

export class ClientesService {
  async listarClientes(tenantId: string, params: { busca?: string; page: number; limit: number }) {
    const { busca, page, limit } = params;
    const offset = (page - 1) * limit;

    const baseConditions = [eq(customers.tenantId, tenantId)];
    
    if (busca) {
      const searchTerm = `%${busca}%`;
      baseConditions.push(
        or(
          ilike(consumerProfiles.name, searchTerm),
          ilike(consumerProfiles.document, searchTerm)
        )!
      );
    }

    const whereClause = and(...baseConditions);

    const data = await db
      .select({
        id: customers.id,
        nome: consumerProfiles.name,
        document: consumerProfiles.document,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .innerJoin(consumerProfiles, eq(customers.consumerProfileId, consumerProfiles.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(customers.createdAt));

    const totalResult = await db
      .select({ count: count() })
      .from(customers)
      .innerJoin(consumerProfiles, eq(customers.consumerProfileId, consumerProfiles.id))
      .where(whereClause);

    const total = totalResult[0].count;

    return {
      clientes: data,
      total,
      paginaAtual: page,
      totalPaginas: Math.ceil(total / limit),
    };
  }

  async buscarPorCpf(tenantId: string, document: string) {
    const cpfValidation = validateAndCleanCPF(document);
    if (!cpfValidation.isValid) {
      throw new AppError(cpfValidation.error || "CPF inválido.");
    }

    const result = await db
      .select({
        id: customers.id,
        document: consumerProfiles.document,
        nome: consumerProfiles.name,
        consumerProfileId: consumerProfiles.id,
        authUserId: consumerProfiles.authUserId,
      })
      .from(customers)
      .innerJoin(consumerProfiles, eq(customers.consumerProfileId, consumerProfiles.id))
      .where(and(eq(customers.tenantId, tenantId), eq(consumerProfiles.document, cpfValidation.cleaned)))
      .limit(1);

    if (result.length === 0) return null;

    return result[0];
  }

  async cadastrarCliente(tenantId: string, operatorId: string, input: { nome?: string; document: string; lgpdConsentimento: boolean }) {
    if (!input.document) {
      throw new AppError("CPF é obrigatório.");
    }

    if (input.lgpdConsentimento !== true) {
      throw new AppError("É necessário aceitar a política de LGPD.");
    }

    const cpfValidation = validateAndCleanCPF(input.document);
    if (!cpfValidation.isValid) {
      throw new AppError(cpfValidation.error || "CPF inválido.");
    }

    const cleanedDoc = cpfValidation.cleaned;

    const result = await db.transaction(async (tx) => {
      // 1. Lock do Tenant para evitar condições de corrida (Race Conditions)
      await tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for("update");

      // 2. Criar ou atualizar consumer_profile
      let [profile] = await tx.insert(consumerProfiles).values({
        document: cleanedDoc,
        name: input.nome,
        lgpdConsent: input.lgpdConsentimento,
        consentDate: new Date().toISOString(),
        consentOperatorId: operatorId && operatorId !== "SISTEMA" ? operatorId : null,
      }).onConflictDoUpdate({
        target: [consumerProfiles.document],
        set: {
          name: input.nome,
          lgpdConsent: input.lgpdConsentimento,
          consentDate: new Date().toISOString(),
          consentOperatorId: operatorId && operatorId !== "SISTEMA" ? operatorId : null,
          updatedAt: new Date().toISOString(),
        }
      }).returning();

      // 3. Criar ou atualizar customer
      const existingCustomer = await tx.query.customers.findFirst({
        where: and(
          eq(customers.tenantId, tenantId),
          eq(customers.consumerProfileId, profile.id)
        ),
      });



      const [cliente] = await tx.insert(customers).values({
        tenantId,
        consumerProfileId: profile.id,
      }).onConflictDoUpdate({
        target: [customers.tenantId, customers.consumerProfileId],
        set: {
          updatedAt: new Date().toISOString(),
        }
      }).returning();

      return {
        id: cliente.id,
        document: profile.document,
        nome: profile.name,
        consumerProfileId: profile.id,
      };
    });

    // 4. Registrar na Auditoria (fora da transação para evitar deadlocks)
    await logAuditEvent({
      tenantId,
      operatorId: operatorId && operatorId !== "SISTEMA" ? operatorId : null,
      action: "CREATE_CUSTOMER",
      entityType: "CUSTOMER",
      entityId: String(result.id),
      metadata: {
        clienteId: result.id,
        clienteNome: result.nome,
        clienteCpf: result.document,
      }
    });

    return result;
  }

  async buscarPerfilGlobalPorCpf(document: string) {
    const cpfValidation = validateAndCleanCPF(document);
    if (!cpfValidation.isValid) {
      throw new AppError(cpfValidation.error || "CPF inválido.");
    }

    const result = await db
      .select({
        consumerProfileId: consumerProfiles.id,
        document: consumerProfiles.document,
        nome: consumerProfiles.name,
        authUserId: consumerProfiles.authUserId,
      })
      .from(consumerProfiles)
      .where(eq(consumerProfiles.document, cpfValidation.cleaned))
      .limit(1);

    if (result.length === 0) return null;
    return result[0];
  }

  async obterStatusClientePorCpf(tenantId: string, document: string) {
    const cpfValidation = validateAndCleanCPF(document);
    if (!cpfValidation.isValid) {
      throw new AppError(cpfValidation.error || "CPF inválido.");
    }

    const local = await this.buscarPorCpf(tenantId, cpfValidation.cleaned);
    if (local) {
      return {
        id: local.id,
        document: local.document,
        nome: local.nome,
        consumerProfileId: local.consumerProfileId,
        existsGlobally: true,
        hasActiveAccount: !!local.authUserId,
        isGlobalOnly: false,
      };
    }

    const globalProfile = await this.buscarPerfilGlobalPorCpf(cpfValidation.cleaned);
    if (globalProfile) {
      return {
        id: null,
        document: globalProfile.document,
        nome: globalProfile.nome,
        consumerProfileId: globalProfile.consumerProfileId,
        existsGlobally: true,
        hasActiveAccount: !!globalProfile.authUserId,
        isGlobalOnly: true,
      };
    }

    return null;
  }

  async vincularPerfilExistente(tenantId: string, profile: { consumerProfileId: string; document: string; nome: string | null }, operatorId?: string | null) {
    const result = await db.transaction(async (tx) => {
      // 1. Lock do Tenant para evitar condições de corrida (Race Conditions)
      await tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for("update");

      // 2. Verificar se já existe vínculo
      const existing = await tx.query.customers.findFirst({
        where: and(
          eq(customers.tenantId, tenantId),
          eq(customers.consumerProfileId, profile.consumerProfileId)
        ),
      });



      const [cliente] = await tx.insert(customers).values({
        tenantId,
        consumerProfileId: profile.consumerProfileId,
      }).onConflictDoUpdate({
        target: [customers.tenantId, customers.consumerProfileId],
        set: {
          updatedAt: new Date().toISOString(),
        }
      }).returning();

      return {
        id: cliente.id,
        document: profile.document,
        nome: profile.nome,
        consumerProfileId: profile.consumerProfileId,
      };
    });

    // 4. Registrar o vínculo na auditoria (fora da transação para evitar deadlocks)
    const validOperatorId = operatorId && operatorId !== "SISTEMA" ? operatorId : null;
    await logAuditEvent({
      tenantId,
      operatorId: validOperatorId,
      action: "LINK_GLOBAL_CUSTOMER",
      entityType: "CUSTOMER",
      entityId: String(result.id),
      metadata: {
        clienteId: result.id,
        clienteNome: result.nome,
        clienteCpf: result.document,
      }
    });

    return result;
  }

  async consultarSaldo(tenantId: string, document: string) {
    const cliente = await this.buscarPorCpf(tenantId, document);

    if (!cliente) {
      throw new NotFoundError("Cliente não encontrado.");
    }

    const now = new Date().toISOString();

    const resultDisponiveis = await db.execute(sql`
      SELECT COALESCE(SUM(remaining_points), 0) as total 
      FROM transactions 
      WHERE customer_id = ${cliente.id} 
        AND tenant_id = ${tenantId} 
        AND available_at <= ${now} 
        AND expires_at > ${now}
    `);
    const disponiveis = resultDisponiveis.rows[0] as any;

    const resultPendentes = await db.execute(sql`
      SELECT COALESCE(SUM(remaining_points), 0) as total 
      FROM transactions 
      WHERE customer_id = ${cliente.id} 
        AND tenant_id = ${tenantId} 
        AND available_at > ${now}
    `);
    const pendentes = resultPendentes.rows[0] as any;

    const resultExpirando = await db.execute(sql`
      SELECT COALESCE(SUM(remaining_points), 0) as total, MIN(expires_at) as data_proxima_expiracao 
      FROM transactions 
      WHERE customer_id = ${cliente.id} 
        AND tenant_id = ${tenantId} 
        AND available_at <= ${now} 
        AND expires_at > ${now} 
        AND expires_at <= (${now}::timestamp + INTERVAL '7 days') 
        AND remaining_points > 0
    `);
    const expirando = resultExpirando.rows[0] as any;

    // Buscando Lançamentos (Earns)
    const historicoTransacoes = await db.query.transactions.findMany({
      where: (t, { eq, and }) => and(
        eq(t.customerId, cliente.id),
        eq(t.tenantId, tenantId)
      )
    });

    // Buscando Resgates (Spends)
    const { rows: spends } = await db.execute<{
      id: number;
      created_at: string;
      points_spent: number;
      reward_name: string;
    }>(sql`
      SELECT r.id, r.created_at, r.points_spent, rew.name as reward_name
      FROM redemptions r
      JOIN rewards rew ON r.reward_id = rew.id
      WHERE r.customer_id = ${cliente.id} AND r.tenant_id = ${tenantId}
    `);

    // Buscando Expirações (Expires)
    const { rows: expirationsList } = await db.execute<{
      id: number;
      created_at: string;
      points_expired: number;
    }>(sql`
      SELECT e.id, e.created_at, e.points_expired
      FROM expirations e
      WHERE e.customer_id = ${cliente.id} AND e.tenant_id = ${tenantId}
    `);

    // Unificando Histórico
    const extrato = [
      ...historicoTransacoes.map(t => ({
        data: t.createdAt,
        tipo: "credito",
        descricao: `Lançamento - Compra R$ ${t.amountSpent}`,
        pontos: t.pointsEarned,
      })),
      ...spends.map(r => ({
        data: r.created_at,
        tipo: "debito",
        descricao: `Resgate: ${r.reward_name}`,
        pontos: r.points_spent,
      })),
      ...expirationsList.map(e => ({
        data: e.created_at,
        tipo: "expirado",
        descricao: "Pontos expirados",
        pontos: e.points_expired,
      }))
    ].sort((a, b) => new Date(b.data || "").getTime() - new Date(a.data || "").getTime());

    return {
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        document: cliente.document,
        pontosDisponiveis: Number(disponiveis?.total || 0),
        pontosPendentes: Number(pendentes?.total || 0),
        pontosExpirando: Number(expirando?.total || 0),
        dataProximaExpiracao: expirando?.data_proxima_expiracao || null,
      },
      extrato,
    };
  }
}

export const clientesService = new ClientesService();
