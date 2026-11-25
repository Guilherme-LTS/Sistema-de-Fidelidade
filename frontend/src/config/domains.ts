/**
 * Domínios oficiais da plataforma SaaS Pontus.
 * Centraliza as URLs de navegação inter-domínios (Hard Navigation) para evitar
 * requisições RSC Cross-Origin e preloading indevido de CSS/JS entre subdomínios.
 *
 * Usa NODE_ENV em vez de `typeof window` para garantir renderização idêntica
 * entre SSR e hidratação no cliente (evitando React Hydration Mismatch).
 */

const isDevelopment = process.env.NODE_ENV !== "production";

const getLandingDomain = () => {
  if (isDevelopment) {
    return "";
  }
  return process.env.NEXT_PUBLIC_LANDING_URL || "https://www.usepontus.com.br";
};

const getAppDomain = () => {
  if (isDevelopment) {
    return "";
  }
  return process.env.NEXT_PUBLIC_APP_URL || "https://app.usepontus.com.br";
};

export const DOMAINS = {
  landing: getLandingDomain(),
  app: getAppDomain(),
};
