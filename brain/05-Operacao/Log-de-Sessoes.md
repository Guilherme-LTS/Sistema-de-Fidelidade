---
title: Log de Sessões e Decisões
tags:
  - pontus
  - operacao
  - changelog
updated: 2026-11-23
summary: Registro cronológico enxuto do que foi feito em cada sessão de desenvolvimento com IA.
---

# 📓 Log de Sessões e Decisões

Relacionado: [[00-INDEX]]

> **Instrução para IA:** Ao finalizar uma implementação relevante, adicione uma entrada curta no topo desta lista com data, resumo do que mudou e arquivos principais afetados.

---

## 2026-11-24 — Revisão de Segurança (`security/revisao-seguranca`)
- **Auditoria completa** de SQL Injection, XSS/HTML Injection, Open Redirect, IDOR, Mass Assignment, CORS, Rate Limiting e Security Headers.
- **Correções aplicadas**:
  - **Open Redirect bloqueado** em `frontend/src/app/auth/callback/route.ts` via `sanitizeRedirectPath` (rejeita `//evil.com`, `@evil.com` e URLs externas).
  - **Security Headers OWASP** adicionados em `frontend/next.config.mjs` (removido `Access-Control-Allow-Origin: *` das páginas; adicionados `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`).
  - **CORS endurecido** em `backend/src/config/cors.ts` com parse `new URL(origin)`, exigindo `https:` para `*.usepontus.com.br` e restringindo `localhost` a `NODE_ENV !== "production"`.
  - **HTML Injection bloqueado** no template de convite (`backend/src/infra/email/templates/invitation.ts`).
  - **Protocolo `javascript:` bloqueado** com `safeHttpUrlSchema` (`backend/src/shared/validators/url.ts`) aplicado a `logoUrl`, `socialLinks.*` e `recompensas.imageUrl`, além de `escapeLikePattern` na busca de auditoria.
  - **Convites endurecidos** (`auth.routes.ts`): validação UUID no `:token`, verificação obrigatória de expiração no `/accept`, comparação case-insensitive de e-mail e execução dentro de `db.transaction`.
  - **Rotas públicas e equipe blindadas**: rate limit rígido (`5–20 req/min`) em `/public/consumer/*`, remoção de `admin.listUsers()` sem paginação em `public.routes.ts` e `usuarios.service.ts`, remoção de vazamento de `error.message` em 500s (`public.routes.ts`, `dashboard.controller.ts`), `crypto.timingSafeEqual` no `CRON_SECRET`, proteção contra auto-exclusão/auto-desativação de admin e remoção de `novato` das rotas operacionais.
  - **Testes unitários** de segurança adicionados em `backend/tests/unit/security-validators.test.ts`.

## 2026-11-24 — Regressão Completa, Correções de Frontend/CI e Limpeza do Repositório
- **O que foi feito**:
  - Rodada completa de regressão (`typecheck`, `lint`, `build`) em `backend/` e `frontend/`.
  - **Frontend**: Corrigidos **12 erros de ESLint**, incluindo um bug real de `react-hooks/rules-of-hooks` (`useBillingState` chamado após early return em `assinatura-view.tsx`), funções declaradas após `useEffect` (`convites/aceitar/page.tsx`, `checkout-success-modal.tsx`, `trial-onboarding-modal.tsx`) e aspas não escapadas em JSX (`painel/[slug]/page.tsx`, `programa-fidelidade-tab.tsx`).
  - **CI (`.github/workflows/ci.yml`)**: Job `frontend-check` atualizado de `pnpm build` para `pnpm check` (`typecheck && lint && build`).
  - **Configuração & Docs**: `backend/.env.example` atualizado (`RESEND_API_KEY` adicionada, variáveis obsoletas `ESSENCIAL` removidas) e `README.md` atualizado (logo corrigida, Stripe/Billing marcados como concluídos, link para `brain/`).
  - **Limpeza**: Removidos 14 arquivos `.md`/`.txt` legados da raiz (já consolidados no Vault `brain/`), 5 scripts soltos em `backend/src/` (`advance-time.ts`, `list_tables.ts`, `reset-full.ts`, `reset.ts`, `wipe.ts`) e `backend/result.json`.

## 2026-11-23 — Criação do Cérebro no Obsidian (`brain/`) e Auditoria Inicial
- **Contexto**: Retomada do projeto Pontus (`usepontus.com.br`) com foco em organização de contexto para IA, novas features e preparação comercial.
- **O que foi feito**:
  - Varredura completa do monorepo (`frontend/`, `backend/`, `render.yaml`, `storage-rls.sql`, `usepontus.com.br.txt`).
  - Criação do Vault do Obsidian dentro do repositório em `brain/` com índice MOC (`00-INDEX.md`) e 11 notas temáticas cobrindo Arquitetura, DNS/Cloudflare, Supabase, Stripe, Resend, Tags/SEO, Regras FIFO de Fidelidade, Auth B2B/B2C, Identidade Visual oficial e Dívidas Técnicas.
  - Criação do arquivo `AGENTS.md` na raiz do repositório para orientar agentes de IA a consultarem `brain/00-INDEX.md` antes de qualquer tarefa.
  - Atualização do `.gitignore` para ignorar estados de janela locais do Obsidian (`brain/.obsidian/workspace*.json` e `cache`).
