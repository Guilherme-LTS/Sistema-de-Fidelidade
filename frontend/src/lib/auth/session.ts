const ACCESS_TOKEN_KEY = "token"

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setStoredAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearStoredAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
}
