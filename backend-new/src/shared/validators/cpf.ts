export function validateAndCleanCPF(document: string): { isValid: boolean; cleaned: string; error?: string } {
  if (!document || typeof document !== "string") {
    return { isValid: false, cleaned: "", error: "CPF é obrigatório." };
  }

  const cleaned = document.replace(/\D/g, "");

  if (cleaned.length !== 11) {
    return { isValid: false, cleaned, error: "CPF deve conter 11 dígitos." };
  }

  if (!isValidCpf(cleaned)) {
    return { isValid: false, cleaned, error: "CPF inválido." };
  }

  return { isValid: true, cleaned };
}

export function isValidCpf(cleaned: string) {
  if (!/^\d{11}$/.test(cleaned)) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }

  const digits = cleaned.split("").map(Number);
  const calculateCheckDigit = (baseLength: number) => {
    const sum = digits
      .slice(0, baseLength)
      .reduce((total, digit, index) => total + digit * (baseLength + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateCheckDigit(9) === digits[9] && calculateCheckDigit(10) === digits[10];
}
