import { eq, and } from "drizzle-orm";
import { db } from "../../infra/database/db.js";
import { transactions, tenantSettings } from "../../infra/database/schema.js";
import { AppError } from "../../shared/errors/app-error.js";
import { validateAndCleanCPF } from "../../shared/validators/cpf.js";
import { clientesService } from "../clientes/clientes.service.js";

type LancarPontosInput = {
  tenantId: string;
  operatorId?: string;
  document: string;
  valor: number;
  nome?: string;
  lgpdConsentimento?: boolean;
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

    const pontosGanhos = Math.floor(input.valor);
    if (pontosGanhos === 0) {
      throw new AppError("O valor não é suficiente para gerar pontos inteiros.");
    }

    // Buscar configurações do Tenant
    const settings = await db.query.tenantSettings.findMany({
      where: eq(tenantSettings.tenantId, input.tenantId),
    });

    const carenciaSetting = settings.find(s => s.settingKey === "carencia_pontos");
    const expiracaoSetting = settings.find(s => s.settingKey === "expiracao_pontos");

    const carenciaDias = carenciaSetting?.settingValue || 0;
    const expiracaoDias = expiracaoSetting?.settingValue || 90;

    const now = new Date();
    const availableAt = new Date(now.getTime() + carenciaDias * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(now.getTime() + expiracaoDias * 24 * 60 * 60 * 1000);

    let cliente: any = await clientesService.buscarPorCpf(input.tenantId, cleanedDoc);

    if (!cliente) {
      if (!input.nome || input.lgpdConsentimento !== true) {
        throw new AppError("Cliente não encontrado. Para cadastrar um novo, envie 'nome' e aceite a LGPD.");
      }
      cliente = await clientesService.cadastrarCliente(input.tenantId, {
        document: cleanedDoc,
        nome: input.nome,
        lgpdConsentimento: input.lgpdConsentimento,
      });
    }

    // Inserir a transação
    await db.insert(transactions).values({
      customerId: cliente.id,
      tenantId: input.tenantId,
      operatorId: input.operatorId,
      amountSpent: input.valor.toString(), // numeric column
      pointsEarned: pontosGanhos,
      remainingPoints: pontosGanhos,
      availableAt: availableAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    // TODO: Adicionar Auditoria (Log) quando a tabela for mapeada

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
