export const routes = {
  public: {
    home: "/",
    meusPontos: "/meus-pontos",
  },
  auth: {
    login: "/login",
    cadastro: "/cadastro",
  },
  admin: {
    root: "/admin",
    dashboard: "/admin/dashboard",
    clientes: "/admin/clientes",
    fidelidade: "/admin/fidelidade",
    configuracoes: "/admin/configuracoes",
  },
} as const
