import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { clientesService } from "./clientes.service.js";
import { successResponse } from "../../shared/http/response.js";

const listarQuerySchema = z.object({
  busca: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(15),
});

const cadastrarBodySchema = z.object({
  nome: z.string().min(2),
  document: z.string().min(11), // CPF
  lgpdConsentimento: z.boolean().refine(val => val === true, {
    message: "É necessário aceitar os termos de LGPD.",
  }),
});

export class ClientesController {
  async listar(request: FastifyRequest, reply: FastifyReply) {
    const query = listarQuerySchema.parse(request.query);
    const tenantId = request.user!.tenantId;

    const resultado = await clientesService.listarClientes(tenantId, query);

    return successResponse(resultado);
  }

  async cadastrar(request: FastifyRequest, reply: FastifyReply) {
    const body = cadastrarBodySchema.parse(request.body);
    const tenantId = request.user!.tenantId;

    const cliente = await clientesService.cadastrarCliente(tenantId, body);

    return reply.status(201).send(successResponse(cliente, "Cliente cadastrado com sucesso."));
  }

  async saldo(request: FastifyRequest<{ Params: { document: string } }>, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    const document = request.params.document;

    const saldo = await clientesService.consultarSaldo(tenantId, document);

    return successResponse(saldo);
  }

  async buscarPorCpf(request: FastifyRequest<{ Params: { document: string } }>, reply: FastifyReply) {
    const tenantId = request.user!.tenantId;
    const document = request.params.document;

    const cliente = await clientesService.buscarPorCpf(tenantId, document);
    
    // Return null data if not found instead of 404, easier for the form logic
    return successResponse(cliente);
  }
}

export const clientesController = new ClientesController();
