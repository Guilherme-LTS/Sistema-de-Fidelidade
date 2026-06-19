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
          ilike(customers.name, searchTerm),
          ilike(customers.document, searchTerm)
        )!
      );
    }

    const whereClause = and(...baseConditions);

    const data = await db.query.customers.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(customers.createdAt)],
    });

    const totalResult = await db
      .select({ count: count() })
      .from(customers)
      .where(whereClause);

    const total = totalResult[0].count;

    return {
      clientes: data.map(c => ({
        id: c.id,
        nome: c.name,
        document: c.document,
        totalPoints: c.totalPoints,
        createdAt: c.createdAt,
      })),
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

    const cliente = await db.query.customers.findFirst({
      where: (c, { eq, and }) => and(
        eq(c.tenantId, tenantId),
        eq(c.document, cpfValidation.cleaned)
      )
    });

    if (!cliente) return null;

    return {
      id: cliente.id,
      document: cliente.document,
      nome: cliente.name,
      totalPoints: cliente.totalPoints,
    };
  }

  async cadastrarCliente(tenantId: string, input: { nome: string; document: string; lgpdConsentimento: boolean }) {
    if (!input.nome || !input.document) {
      throw new AppError("Nome e CPF são obrigatórios.");
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
      document: cleanedDoc,
      name: input.nome,
      lgpdConsent: input.lgpdConsentimento,
      consentDate: new Date().toISOString(),
    }).onConflictDoUpdate({
      target: [customers.tenantId, customers.document],
      set: {
        name: input.nome,
        lgpdConsent: input.lgpdConsentimento,
        consentDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }).returning();

    return cliente;
  }
  async consultarSaldo(tenantId: string, document: string) {
    const cpfValidation = validateAndCleanCPF(document);
    if (!cpfValidation.isValid) {
      throw new AppError(cpfValidation.error || "CPF inválido.");
    }

    const cliente = await db.query.customers.findFirst({
      where: (c, { eq, and }) => and(
        eq(c.tenantId, tenantId),
        eq(c.document, cpfValidation.cleaned)
      )
    });

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
        nome: cliente.name,
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
