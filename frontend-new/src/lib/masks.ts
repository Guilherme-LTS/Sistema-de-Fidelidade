export function formatPhone(value: string): string {
  if (!value) return ""
  
  // Remove tudo que não é dígito
  let r = value.replace(/\D/g, "")
  
  // Se for celular (11 dígitos) ou fixo (10 dígitos)
  if (r.length > 11) {
    r = r.slice(0, 11)
  }
  
  if (r.length > 10) {
    r = r.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3")
  } else if (r.length > 5) {
    r = r.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3")
  } else if (r.length > 2) {
    r = r.replace(/^(\d\d)(\d{0,5})/, "($1) $2")
  } else {
    r = r.replace(/^(\d*)/, "($1")
  }
  
  return r
}

export function formatCNPJ(value: string): string {
  if (!value) return ""
  
  let r = value.replace(/\D/g, "")
  if (r.length > 14) r = r.slice(0, 14)
  
  if (r.length > 12) {
    r = r.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, "$1.$2.$3/$4-$5")
  } else if (r.length > 8) {
    r = r.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/, "$1.$2.$3/$4")
  } else if (r.length > 5) {
    r = r.replace(/^(\d{2})(\d{3})(\d{0,3}).*/, "$1.$2.$3")
  } else if (r.length > 2) {
    r = r.replace(/^(\d{2})(\d{0,3})/, "$1.$2")
  }
  
  return r
}

export function formatCPF(value: string): string {
  if (!value) return ""
  
  let r = value.replace(/\D/g, "")
  if (r.length > 11) r = r.slice(0, 11)
  
  if (r.length > 9) {
    r = r.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, "$1.$2.$3-$4")
  } else if (r.length > 6) {
    r = r.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, "$1.$2.$3")
  } else if (r.length > 3) {
    r = r.replace(/^(\d{3})(\d{0,3})/, "$1.$2")
  }
  
  return r
}

export function isValidCNPJ(cnpj: string): boolean {
  if (!cnpj) return false

  const numbers = cnpj.replace(/\D/g, "")
  if (numbers.length !== 14) return false

  // Invalid sequences
  if (/^(\d)\1+$/.test(numbers)) return false

  let length = numbers.length - 2
  let val = numbers.substring(0, length)
  const digits = numbers.substring(length)
  let sum = 0
  let pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += parseInt(val.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false

  length = length + 1
  val = numbers.substring(0, length)
  sum = 0
  pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(val.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false

  return true
}

export function getPasswordStrength(password: string): number {
  if (!password) return 0
  
  let score = 0
  
  // Length > 8
  if (password.length >= 8) score += 1
  
  // Has lowercase and uppercase
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  
  // Has number
  if (/\d/.test(password)) score += 1
  
  // Has special char
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  
  return score // 0-4
}
