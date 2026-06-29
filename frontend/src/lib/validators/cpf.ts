export function applyCpfMask(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
}

export function isValidCpf(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");

  if (cleaned.length !== 11) {
    return false;
  }

  // Verifica sequências repetidas como 11111111111
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
