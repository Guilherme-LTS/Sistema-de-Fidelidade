export function mapAuthError(error: Error | string | unknown): Error {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("New password should be different from the old password")) {
    return new Error("A nova senha deve ser diferente da senha anterior.")
  }

  if (message.includes("Invalid login credentials")) {
    return new Error("E-mail ou senha inválidos.")
  }

  if (message.includes("Email not confirmed")) {
    return new Error("E-mail não confirmado. Verifique sua caixa de entrada.")
  }

  if (message.includes("Password should be at least 6 characters")) {
    return new Error("A senha deve ter pelo menos 6 caracteres.")
  }

  if (message.includes("User not found")) {
    return new Error("Usuário não encontrado.")
  }

  if (message.includes("For security purposes, you can only request this once every")) {
    return new Error("Por motivos de segurança, aguarde alguns instantes antes de tentar novamente.")
  }
  
  if (message.includes("invalid claim: missing sub claim")) {
    return new Error("Sessão inválida ou expirada. Faça login novamente.")
  }

  // Fallback para a mensagem original (útil para debug)
  return new Error(message)
}
