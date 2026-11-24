---
title: Domínios, DNS e Roteamento Multi-Subdomínio
tags:
  - pontus
  - arquitetura
  - dns
  - cloudflare
  - middleware
updated: 2026-11-23
summary: Configuração DNS na Cloudflare para usepontus.com.br e regras do middleware Next.js que separam rotas B2C (www) e B2B (app).
---

# 🌐 Domínios, DNS e Roteamento (`usepontus.com.br`)

Relacionado: [[00-INDEX]] | [[01-Arquitetura/Stack-e-Ambientes]] | [[02-Infra-e-Integracoes/Resend-Emails]]

## 1. Configuração de DNS (Cloudflare)

O domínio `usepontus.com.br` utiliza nameservers da **Cloudflare** (`dara.ns.cloudflare.com` e `marvin.ns.cloudflare.com`).

### Registros CNAME (Aplicação e API)
| Host / Subdomínio | Destino (Target) | Proxy Cloudflare | Papel |
| :--- | :--- | :--- | :--- |
| `usepontus.com.br` | `b5408cba281e41ca.vercel-dns-017.com.` | `DNS Only` (`cf-proxied:false`) | Domínio raiz (Vercel) |
| `www.usepontus.com.br` | `b5408cba281e41ca.vercel-dns-017.com.` | `DNS Only` (`cf-proxied:false`) | **B2C**: Landing Page + Portal do Consumidor (Vercel) |
| `app.usepontus.com.br` | `cname.vercel-dns.com.` | `DNS Only` (`cf-proxied:false`) | **B2B**: Painel Administrativo do Restaurante (Vercel) |
| `api.usepontus.com.br` | `sistema-fidelidade-api.onrender.com.` | `Proxied` (`cf-proxied:true`) | **API Backend** Fastify hospedada no Render |

### Registros de E-mail e Verificação (MX / TXT)
| Tipo | Nome | Valor | Finalidade |
| :--- | :--- | :--- | :--- |
| `MX` | `send.usepontus.com.br` | `10 feedback-smtp.sa-east-1.amazonses.com.` | Bounce/feedback do **Resend** (AWS SES São Paulo) |
| `TXT` | `send.usepontus.com.br` | `"v=spf1 include:amazonses.com ~all"` | Autorização SPF para envio via Resend |
| `TXT` | `resend._domainkey.usepontus.com.br` | `"p=MIGfMA0GCSqGSIb3DQEBAQUAA4..."` | Assinatura DKIM do Resend |
| `TXT` | `_dmarc.usepontus.com.br` | `"v=DMARC1; p=reject;"` | Política DMARC estrita (`reject`) |
| `MX` | `usepontus.com.br` | `0 .` | Null MX no domínio raiz (não recebe e-mails na raiz) |
| `TXT` | `usepontus.com.br` | `"v=spf1 -all"` | Bloqueia envio direto pelo domínio raiz (envios saem via subdomínio `send`) |
| `TXT` | `usepontus.com.br` | `"google-site-verification=c2c3ZZEc7..."` | Verificação do Google Search Console |

---

## 2. Roteamento B2C vs B2B no Frontend (`frontend/src/middleware.ts`)

O mesmo projeto Next.js atende `www.usepontus.com.br` e `app.usepontus.com.br`. O `middleware.ts` intercepta requisições em produção (ignorando `localhost`, `127.0.0.1` e `.vercel.app`) e aplica redirecionamento `307`:

1. **Rotas B2B (`isMerchantB2BRoute` → forçadas para `app.usepontus.com.br`)**:
   - `/admin/*` (`/admin/dashboard`, `/admin/clientes`, `/admin/fidelidade`, `/admin/recompensas`, `/admin/configuracoes`, `/admin/assinatura`, `/admin/auditoria`, `/admin/equipe`, `/admin/perfil`)
   - `/login`, `/cadastro`, `/alterar-senha`, `/confirmacao-pendente`, `/convites/*`
2. **Rotas B2C (`isConsumerB2CRoute` → forçadas para `www.usepontus.com.br`)**:
   - `/` (Landing Page institucional)
   - `/painel/*` (Portal logado do consumidor final)
   - `/acesso` (Login/cadastro do consumidor final)
   - `/perfil` (Perfil do consumidor)
   - `/fidelidade/*`

### Navegação Cross-Subdomain (`frontend/src/config/domains.ts`)
- Para navegar entre `www` e `app` sem causar erros de requisição RSC Cross-Origin no Next.js, o frontend usa `DOMAINS.landing` e `DOMAINS.app` com **Hard Navigation** (`window.location.href` / tag `<a>` padrão em vez de `<Link>` RSC quando cruza subdomínios).
- Em `localhost`, `DOMAINS.landing` e `DOMAINS.app` retornam `""` (string vazia), permitindo testar todas as rotas B2B e B2C na mesma porta `3000`.
