import { eq, and } from "drizzle-orm";
import { db } from "../../infra/database/db.js";
import { transactions, tenants } from "../../infra/database/schema.js";
import { AppError } from "../../shared/errors/app-error.js";
import { validateAndCleanCPF } from "../../shared/validators/cpf.js";
import { clientesService } from "../clientes/clientes.service.js";
import { logAuditEvent } from "../../shared/audit.service.js";

type LancarPontosInput = {
  tenantId: string;
  operatorId?: string;
  authUserId?: string;
  document: string;
  valor: number;
  nome?: string;
  lgpdConsentimento?: boolean;
  ipAddress?: string;
};

export class TransacoesService {
  async lancarPontos(input: LancarPontosInput) {
    if (input.valor <= 0) {
      throw new AppError("O valor da compra deve ser maior que zero.");
    }

    const cpfValidation = validateAndCleanCPF(input.document);
    if (!cpfValidation.isValid) {
      throw new AppError(cpfValidation.error || "CPF inválido.");
    }

    const cleanedDoc = cpfValidation.cleaned;

    // Buscar configurações do Tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, input.tenantId),
      columns: {
        loyaltyGracePeriodDays: true,
        loyaltyExpirationDays: true,
        pointsConversionReal: true,
      }
    });

    const conversionReal = tenant?.pointsConversionReal ? Number(tenant.pointsConversionReal) : 1.00;
    const divisor = conversionReal > 0 ? conversionReal : 1.00;

    const pontosGanhos = Math.floor(input.valor / divisor);
    if (pontosGanhos === 0) {
      throw new AppError(`O valor da compra não é suficiente para gerar pontos. Valor mínimo para este restaurante: R$ ${divisor.toFixed(2).replace(".", ",")}.`);
    }

    const carenciaDias = tenant?.loyaltyGracePeriodDays || 0;
    const expiracaoDias = tenant?.loyaltyExpirationDays || 90;

    const now = new Date();
    const availableAt = new Date(now.getTime() + carenciaDias * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(now.getTime() + expiracaoDias * 24 * 60 * 60 * 1000);

    let cliente: any = await clientesService.buscarPorCpf(input.tenantId, cleanedDoc);

    if (!cliente) {
      // 1. Tenta buscar na base global de clientes (já aceitou LGPD na plataforma)
      const perfilGlobal = await clientesService.buscarPerfilGlobalPorCpf(cleanedDoc);

      if (perfilGlobal) {
        // Se existe globalmente, vincula o cliente ao restaurante automaticamente
        cliente = await clientesService.vincularPerfilExistente(input.tenantId, perfilGlobal, input.authUserId);
      } else {
        // 2. Não existe globalmente, precisamos do aceite da LGPD para criar o perfil
        if (input.lgpdConsentimento !== true) {
          throw new AppError("Cliente não encontrado na base. Para cadastrá-lo, é necessário o aceite da LGPD.");
        }
        cliente = await clientesService.cadastrarCliente(input.tenantId, input.authUserId || "SISTEMA", {
          document: cleanedDoc,
          nome: input.nome, // O nome agora é 100% opcional, o próprio cliente preencherá no portal
          lgpdConsentimento: input.lgpdConsentimento,
        });
      }
    }

    // Inserir a transação
    const [novaTransacao] = await db.insert(transactions).values({
      customerId: cliente.id,
      tenantId: input.tenantId,
      operatorId: input.operatorId,
      amountSpent: input.valor.toString(), // numeric column
      pointsEarned: pontosGanhos,
      remainingPoints: pontosGanhos,
      availableAt: availableAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }).returning();

    // Registrar o evento na Auditoria
    await logAuditEvent({
      tenantId: input.tenantId,
      operatorId: input.authUserId,
      action: 'ADD_POINTS',
      entityType: 'TRANSACTION',
      entityId: String(novaTransacao.id),
      metadata: {
        clienteId: cliente.id,
        clienteNome: cliente.nome || cliente.name,
        clienteCpf: cliente.document,
        pontosGanhos,
        valorCompra: input.valor,
      },
      ipAddress: input.ipAddress,
    });

    return {
      pontosGanhos,
      cliente: {
        id: cliente.id,
        nome: cliente.nome || cliente.name,
        document: cliente.document,
      }
    };
  }
}

export const transacoesService = new TransacoesService();
