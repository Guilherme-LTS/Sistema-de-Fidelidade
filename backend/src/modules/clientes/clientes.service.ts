import { validateAndCleanCPF } from '../../shared/validators/cpf';
import { HttpError } from '../../shared/errors/http-error';
import { ClientesRepository } from './clientes.repository';

export class ClientesService {
  constructor(private readonly repository: ClientesRepository) {}

  async listarClientes(input: { busca?: string; page: number; limit: number; tenantId: string }) {
    const page = Number.isFinite(input.page) && input.page > 0 ? input.page : 1;
    const limit = Number.isFinite(input.limit) && input.limit > 0 ? input.limit : 15;
    const { total, customers } = await this.repository.list({
      busca: input.busca,
      page,
      limit,
      tenantId: input.tenantId,
    });

    return {
      customers,
      total,
      paginaAtual: page,
      totalPaginas: Math.ceil(total / limit),
    };
  }

  async consultarSaldo(input: { tenantId: string; document: string }) {
    const cpfLimpo = this.cleanRouteCpf(input.document);
    const cliente = await this.repository.findByDocument(input.tenantId, cpfLimpo);

    if (!cliente) {
      throw new HttpError(404, 'Cliente nÃ£o encontrado.');
    }

    const summary = await this.repository.getFinancialSummary(input.tenantId, cliente.id);

    return {
      nome: cliente.name,
      document: cliente.document,
      ...summary,
    };
  }

  async consultarExtrato(input: { tenantId: string; document: string; limit: number }) {
    const cpfLimpo = this.cleanRouteCpf(input.document);
    const cliente = await this.repository.findByDocument(input.tenantId, cpfLimpo);

    if (!cliente) {
      throw new HttpError(404, 'Cliente nÃ£o encontrado.');
    }

    return this.repository.getStatement(input.tenantId, cliente.id, input.limit);
  }

  async cadastrarCliente(input: {
    tenantId: string;
    nome: string;
    document: string;
    lgpdConsentimento: boolean;
  }) {
    if (!input.nome || !input.document) {
      throw new HttpError(400, 'Nome e CPF sÃ£o obrigatÃ³rios.');
    }

    if (input.lgpdConsentimento !== true) {
      throw new HttpError(400, 'Ã‰ necessÃ¡rio aceitar os termos de uso e a polÃ­tica de privacidade.');
    }

    const cpfValidation = validateAndCleanCPF(input.document);
    if (!cpfValidation.isValid) {
      throw new HttpError(400, cpfValidation.error || 'Formato de CPF invÃ¡lido.');
    }

    return this.repository.upsertCustomer({
      tenantId: input.tenantId,
      document: cpfValidation.cleaned,
      name: input.nome,
      lgpdConsent: input.lgpdConsentimento,
      consentDate: new Date(),
    });
  }

  private cleanRouteCpf(document: string) {
    const cpfParam = (document || '').replace(/\D/g, '');

    if (!cpfParam || cpfParam.length !== 11) {
      throw new HttpError(400, 'Formato de CPF invÃ¡lido.');
    }

    return cpfParam;
  }
}
