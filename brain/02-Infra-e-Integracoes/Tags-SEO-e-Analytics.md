---
title: Tags, SEO e Analytics
tags:
  - pontus
  - infra
  - seo
  - analytics
  - tags
updated: 2026-11-23
summary: Estado atual das tags de rastreamento, SEO, JSON-LD e metadados no frontend Next.js.
---

# 📈 Tags, SEO e Analytics

Relacionado: [[00-INDEX]] | [[01-Arquitetura/Dominios-DNS-e-Roteamento]]

## 1. O que está instalado atualmente

### Vercel Analytics (`frontend/src/app/layout.tsx`)
- Pacote: `@vercel/analytics` (`1.3.1`).
- Componente `<Analytics />` importado de `@vercel/analytics/next` e renderizado no final do `<body>` do `RootLayout`.

### SEO & Metadados (`frontend/src/app/layout.tsx`)
- **`metadataBase` e `canonical`**: `https://www.usepontus.com.br`
- **Title**: `"Pontus | Fidelidade de Resultados"`
- **Description**: `"A plataforma de fidelidade feita para quem tem estabelecimento comercial, não para quem tem TI."`
- **OpenGraph (`pt_BR`, `website`) & Twitter Card (`summary_large_image`)**:
  - Imagem padrão: `/logo-dark.png` (`1200x630`).
- **Dados Estruturados (JSON-LD `schema.org`)**:
  - Injetado no `<head>` do `RootLayout` como `@type: "SoftwareApplication"`, `applicationCategory: "BusinessApplication"`, `priceCurrency: "BRL"`.
- **Sitemap & Robots**:
  - `frontend/src/app/sitemap.ts`, `frontend/src/app/manifest.ts` e `frontend/public/robots.txt`.
  - No backend (`backend/src/app.ts`), todas as rotas da API enviam o header `X-Robots-Tag: noindex, nofollow`.

### Google Search Console (DNS)
- Registro TXT ativo na zona DNS de `usepontus.com.br`:
  `"google-site-verification=c2c3ZZEc7-gCj22yID01Jj2ExsKDt3z_01IdGMPo3Go"`

---

## 2. O que NÃO está instalado ainda (Oportunidade Comercial / Marketing)

Na varredura do código (`frontend/src/`), **ainda não existem**:
- ❌ **Google Tag Manager (GTM)** (`GTM-XXXXXXX`)
- ❌ **Google Analytics 4 (GA4)** (`G-XXXXXXXXXX` / `gtag.js`)
- ❌ **Meta Pixel (Facebook/Instagram Ads)** (`fbq`)
- ❌ **Microsoft Clarity / Hotjar** (mapas de calor e gravação de sessão na Landing Page)
- ❌ **Eventos de conversão de funil** (ex: clique em "Começar Teste Grátis", conclusão de `/cadastro` B2B, início de Checkout Stripe e assinatura paga).

> **Recomendação quando for iniciar tráfego pago / vendas**: Instalar o container do **Google Tag Manager** ou `@next/third-parties/google` no `frontend/src/app/layout.tsx` e disparar eventos customizados na criação de conta (`/cadastro`) e retorno de sucesso do Stripe Checkout.
