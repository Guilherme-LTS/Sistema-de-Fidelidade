export const actionTranslations: Record<string, string> = {
  LOGIN: "Login no Sistema",
  LOGOUT: "Logout do Sistema",
  CREATE_CUSTOMER: "Cadastro de Cliente",
  LINK_GLOBAL_CUSTOMER: "Vínculo de Cliente Existente",
  UPDATE_CUSTOMER: "Atualização de Cliente",
  DELETE_CUSTOMER: "Exclusão de Cliente",
  ADD_POINTS: "Lançamento de Pontos",
  POINTS_EARNED: "Lançamento de Pontos",
  REDEEM_REWARD: "Resgate de Recompensa",
  REWARD_REDEEMED: "Resgate Realizado",
  CREATE_REWARD: "Criação de Recompensa",
  UPDATE_REWARD: "Atualização de Recompensa",
  DELETE_REWARD: "Exclusão de Recompensa",
  UPDATE_CONFIG: "Configurações Alteradas",
  UPDATE_FIDELIDADE: "Regras de Fidelidade Alteradas",
  CREATE_USER: "Usuário Criado",
  UPDATE_USER: "Perfil de Operador Alterado",
  INVITE_USER: "Convite de Operador Enviado",
  ACTIVATE_USER: "Operador Ativado",
  DEACTIVATE_USER: "Operador Desativado",
  DELETE_USER: "Operador Removido",
  UPDATE_PASSWORD: "Senha Alterada",
  POINTS_EXPIRED: "Pontos Expirados",
}

export const entityTranslations: Record<string, string> = {
  TRANSACTION: "Lançamento de Pontos",
  REDEMPTION: "Resgate de Recompensa",
  TENANT_CONFIG: "Perfil do Restaurante",
  LOYALTY_CONFIG: "Regras de Fidelidade",
  USER: "Operador/Usuário",
  CUSTOMER: "Cadastro de Cliente",
  REWARD: "Recompensa",
}

/**
 * Retorna o nome amigável para uma ação de auditoria.
 * Caso a ação não esteja explicitamente traduzida, formata defensivamente
 * o termo técnico (ex: "NOVA_ACAO_SISTEMA" -> "Nova Acao Sistema")
 * para impedir a exibição de chaves técnicas cruas na interface.
 */
export function getActionLabel(action: string): string {
  if (!action) return "Ação Desconhecida"
  if (actionTranslations[action]) {
    return actionTranslations[action]
  }

  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Retorna o nome amigável para o tipo de entidade afetada no log.
 */
export function getEntityLabel(entityType: string | null): string {
  if (!entityType) return "-"
  if (entityTranslations[entityType]) {
    return entityTranslations[entityType]
  }

  return entityType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}
