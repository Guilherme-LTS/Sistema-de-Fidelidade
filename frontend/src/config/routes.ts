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
    recompensas: "/admin/recompensas",
    configuracoes: "/admin/configuracoes",
    assinatura: "/admin/assinatura",
    auditoria: "/admin/auditoria",
    equipe: "/admin/equipe",
    perfil: "/admin/perfil",
  },
} as const
