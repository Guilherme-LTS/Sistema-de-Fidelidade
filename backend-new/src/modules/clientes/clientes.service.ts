import { eq, and, or, ilike, desc, count, sql } from "drizzle-orm";
import { db } from "../../infra/database/db.js";
import { customers, consumerProfiles } from "../../infra/database/schema.js";
import { validateAndCleanCPF } from "../../shared/validators/cpf.js";
import { AppError, NotFoundError } from "../../shared/errors/app-error.js";

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
      })
      .from(customers)
      .innerJoin(consumerProfiles, eq(customers.consumerProfileId, consumerProfiles.id))
      .where(and(eq(customers.tenantId, tenantId), eq(consumerProfiles.document, cpfValidation.cleaned)))
      .limit(1);

    if (result.length === 0) return null;

    return result[0];
  }

  async cadastrarCliente(tenantId: string, input: { nome?: string; document: string; lgpdConsentimento: boolean }) {
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

    // 1. Criar ou atualizar consumer_profile
    let [profile] = await db.insert(consumerProfiles).values({
      document: cleanedDoc,
      name: input.nome,
      lgpdConsent: input.lgpdConsentimento,
      consentDate: new Date().toISOString(),
    }).onConflictDoUpdate({
      target: [consumerProfiles.document],
      set: {
        name: input.nome,
        lgpdConsent: input.lgpdConsentimento,
        consentDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }).returning();

    // 2. Criar ou atualizar customer
    const [cliente] = await db.insert(customers).values({
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

    const historicoTransacoes = await db.query.transactions.findMany({
      where: (t, { eq, and }) => and(
        eq(t.customerId, cliente.id),
        eq(t.tenantId, tenantId)
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 50,
    });

    const extrato = historicoTransacoes.map(t => ({
      data: t.createdAt,
      tipo: "credito",
      descricao: `Lançamento - Compra R$ ${t.amountSpent}`,
      pontos: t.pointsEarned,
    }));

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
