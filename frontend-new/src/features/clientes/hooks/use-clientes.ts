import { useQuery } from "@tanstack/react-query"
import { listarClientes, consultarClienteComExtrato, ListarClientesInput } from "../clientes.api"

export function useClientes(input: ListarClientesInput) {
  return useQuery({
    queryKey: ["clientes", input],
    queryFn: () => listarClientes(input),
    placeholderData: (previousData) => previousData,
  })
}

export function useClienteComExtrato(cpf: string | null) {
  const cpfLimpo = cpf ? cpf.replace(/\D/g, "") : ""
  return useQuery({
    queryKey: ["cliente-extrato", cpfLimpo],
    queryFn: () => consultarClienteComExtrato(cpfLimpo),
    enabled: cpfLimpo.length === 11,
  })
}
