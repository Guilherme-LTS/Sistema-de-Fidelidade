import { eq, and, or, ilike, desc, count } from "drizzle-orm";
import { db } from "../../infra/database/db.js";
import { customers } from "../../infra/database/schema.js";
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

    // Upsert equivalent: check if exists, update or insert. Or just insert.
    // Drizzle has onConflictDoUpdate
    const result = await db.insert(customers).values({
      tenantId,
      document: cpfValidation.cleaned,
      name: input.nome,
      lgpdConsent: input.lgpdConsentimento,
      consentDate: new Date().toISOString(),
    }).onConflictDoUpdate({
      target: [customers.tenantId, customers.document], // Wait, is there a unique constraint on (tenant_id, document)? Yes, in migration 004!
      set: {
        name: input.nome,
        lgpdConsent: input.lgpdConsentimento,
        consentDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }).returning();

    return result[0];
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

    return {
      cliente: {
        id: cliente.id,
        nome: cliente.name,
        document: cliente.document,
        pontosDisponiveis: cliente.totalPoints,
        pontosPendentes: 0,
        pontosExpirando: 0,
        dataProximaExpiracao: null,
      },
      extrato: [], // Será implementado no módulo de extrato/fidelidade
    };
  }
}

export const clientesService = new ClientesService();
