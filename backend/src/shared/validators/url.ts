import { z } from "zod";

/**
 * Valida que uma URL utiliza estritamente protocolo http: ou https:,
 * bloqueando vetores de XSS como javascript:, data: ou vbscript:.
 */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export const safeHttpUrlSchema = z
  .string()
  .trim()
  .refine((val) => val === "" || isSafeHttpUrl(val), {
    message: "URL inválida. Utilize apenas endereços iniciados com http:// ou https://.",
  });

/**
 * Escapa caracteres especiais de padrões LIKE/ILIKE (% e _ e \)
 * para evitar wildcard injection em buscas.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
