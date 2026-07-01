const ADMIN_ACCESS_TOKEN_KEY = "admin_token"
const CONSUMER_ACCESS_TOKEN_KEY = "consumer_token"

// --- Lojista / Admin ---
export function getStoredAdminToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY)
}

export function setStoredAdminToken(token: string) {
  window.localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, token)
}

export function clearStoredAdminToken() {
  window.localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY)
}

// --- Consumidor / Cliente ---
export function getStoredConsumerToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(CONSUMER_ACCESS_TOKEN_KEY)
}

export function setStoredConsumerToken(token: string) {
  window.localStorage.setItem(CONSUMER_ACCESS_TOKEN_KEY, token)
}

export function clearStoredConsumerToken() {
  window.localStorage.removeItem(CONSUMER_ACCESS_TOKEN_KEY)
}

// --- Fallbacks para compatibilidade temporária ---
export function getStoredAccessToken() {
  if (typeof window === "undefined") return null
  const currentPath = window.location.pathname
  if (currentPath.startsWith("/painel") || currentPath.startsWith("/acesso") || currentPath.startsWith("/perfil")) {
    return getStoredConsumerToken()
  }
  return getStoredAdminToken()
}
