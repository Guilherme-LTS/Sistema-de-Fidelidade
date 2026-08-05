/**
 * Domínios oficiais da plataforma SaaS Pontus.
 * Centraliza as URLs de navegação inter-domínios (Hard Navigation) para evitar
 * requisições RSC Cross-Origin e preloading indevido de CSS/JS entre subdomínios.
 */

const getLandingDomain = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return "";
    }
  }
  return process.env.NEXT_PUBLIC_LANDING_URL || "https://www.usepontus.com.br";
};

const getAppDomain = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return "";
    }
  }
  return process.env.NEXT_PUBLIC_APP_URL || "https://app.usepontus.com.br";
};

export const DOMAINS = {
  landing: getLandingDomain(),
  app: getAppDomain(),
};
