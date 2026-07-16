import { QueryClient } from "@tanstack/react-query"

/**
 * Utilitário centralizado para sincronizar o estado global da aplicação
 * após qualquer mutação financeira (Checkout Stripe, Upgrade, Downgrade, Cancelamento, etc).
 * 
 * Isso evita "Cache Inconsistence" (onde o Perfil é atualizado, mas a tela de Faturas não,
 * obrigando o usuário a dar F5 na página).
 */
export const syncBillingState = async (queryClient: QueryClient) => {
  // 1. Invalida os caches relacionados ao Billing e Autenticação
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["auth-profile"] }),
    queryClient.invalidateQueries({ queryKey: ["billing-details"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
  ])

  // 2. Força o Refetch das queries cruciais imediatamente (para a UI atualizar sem delay/F5)
  await Promise.all([
    queryClient.refetchQueries({ queryKey: ["auth-profile"] }),
    queryClient.refetchQueries({ queryKey: ["billing-details"] })
  ])
}
