import { cpf as cpfValidator } from 'cpf-cnpj-validator';

/**
 * Valida e limpa um CPF
 * @param document CPF bruto (com ou sem formatação)
 * @returns { isValid: boolean; cleaned: string; error?: string }
 */
export function validateAndCleanCPF(document: string): { isValid: boolean; cleaned: string; error?: string } {
  if (!document || typeof document !== 'string') {
    return { isValid: false, cleaned: '', error: 'CPF é obrigatório.' };
  }

  const cleaned = document.replace(/\D/g, '');

  if (cleaned.length !== 11) {
    return { isValid: false, cleaned: '', error: 'CPF deve conter 11 dígitos.' };
  }

  if (!cpfValidator.isValid(cleaned)) {
    return { isValid: false, cleaned: '', error: 'O CPF informado é inválido.' };
  }

  return { isValid: true, cleaned };
}

/**
 * Valida requisição contém CPF válido no body
 * Sou usado como método utilitário para request validation
 */
export function extractAndValidateCPF(body: any): { valid: boolean; cpf: string; error?: string } {
  const result = validateAndCleanCPF(body?.document);
  if (!result.isValid) {
    return { valid: false, cpf: '', error: result.error };
  }
  return { valid: true, cpf: result.cleaned };
}
