---
title: Autenticação B2B vs B2C, Perfis e Permissões (Roles)
tags:
  - pontus
  - regras-de-negocio
  - auth
  - roles
  - b2b
  - b2c
updated: 2026-11-23
summary: Separação entre autenticação de lojistas (B2B) e consumidores (B2C), papéis de equipe e regras de bloqueio por assinatura.
---

# 🔐 Autenticação B2B vs B2C, Perfis e Permissões (Roles)

Relacionado: [[00-INDEX]] | [[01-Arquitetura/Dominios-DNS-e-Roteamento]] | [[02-Infra-e-Integracoes/Supabase-DB-RLS-Storage]]

## 1. Dois Contextos de Autenticação no Mesmo Supabase Auth

Tanto os usuários de restaurantes (B2B) quanto os consumidores finais (B2C) autenticam no **Supabase Auth** (`auth.users`), mas são separados lógica e arquiteturalmente:

| Dimensão | Contexto B2B (Restaurante / Equipe) | Contexto B2C (Consumidor Final) |
| :--- | :--- | :--- |
| **Subdomínio em Produção** | `app.usepontus.com.br` | `www.usepontus.com.br` |
| **Tabela de Perfil** | `tenant_users` (`user_id` → `auth.users.id`) | `consumer_profiles` (`auth_user_id` → `auth.users.id`) |
| **Middleware no Backend** | `requireAuth` (`request.user`) | `requireConsumerAuth` (`request.consumer`) |
| **Rotas de Frontend** | `/login`, `/cadastro`, `/admin/*` | `/acesso`, `/painel`, `/perfil` |
| **Guard no Frontend** | `AuthProvider` (acoplado às rotas B2B) | `ConsumerAuthGuard` (no layout `(consumer)`) |

> **⚠️ Regra Crítica de Sessão no Frontend (registrada em `task.md`)**:
> - O `AuthProvider` B2B **não** deve envolver rotas globais fora do escopo administrativo, para não deslogar sessões de consumidor.
> - No login do consumidor (`consumer-auth-form.tsx`), sempre executar `supabase.auth.signOut()` explícito antes de injetar a nova sessão (`setSession`) e limpar o cache do React Query (`removeQueries`) para evitar *race conditions* entre sessões antigas e novas.

---

## 2. Roles B2B (`tenant_users.role`)

O middleware `requireRole(["admin", ...])` controla o que cada membro da equipe pode fazer:

1. **`admin` (Proprietário / Administrador do Restaurante)**:
   - Acesso total ao painel `/admin/*`.
   - Único que pode gerenciar **Assinatura/Stripe** (`/billing/*`), **Configurações do Restaurante**, **Convidar/Remover Equipe** (`/usuarios/*`) e visualizar **Auditoria**.
2. **`operador` (Atendente / Caixa)**:
   - Focado na operação rápida de balcão/caixa: lançar pontos (`/transacoes`), resgatar recompensas (`/resgates`), cadastrar/consultar clientes (`/clientes`).
   - Sujeito ao limite de operadores do plano (`PlanLimitService.checkOperatorLimit`: máx. 10 no plano Pro/Trial, somando operadores ativos + convites pendentes).
3. **`novato` (Estado transitório)**:
   - Usuário autenticado no Supabase Auth que ainda não possui registro ativo em `tenant_users` (ex: acabou de criar conta para aceitar um convite).
   - O `requireAuth` permite ao `novato` acessar **apenas** `/auth/invitations*`, `/auth/me` e `/auth/tenants`. Qualquer outra rota retorna `403 Forbidden`.

---

## 3. Bloqueio por Inadimplência ou Fim de Trial (`requireSubscription`)

Aplicado nos módulos operacionais (`clientes`, `transacoes`, `recompensas`, `resgates`, `usuarios`):
- **Leituras (`GET`)**: Sempre liberadas, mesmo com assinatura vencida/cancelada, para que o lojista não perca visibilidade dos seus dados.
- **Mutações (`POST`, `PUT`, `PATCH`, `DELETE`)**: Exigem `subscriptionStatus === "active"` ou `"trialing"` dentro da validade de 14 dias. Caso contrário, retorna **HTTP `402 Payment Required`**, acionando o modal/aviso de regularização no frontend.
