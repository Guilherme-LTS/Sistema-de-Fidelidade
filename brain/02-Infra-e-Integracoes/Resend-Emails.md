---
title: Resend — Infraestrutura de E-mails Transacionais
tags:
  - pontus
  - infra
  - resend
  - email
updated: 2026-11-23
summary: Configuração DNS do Resend em usepontus.com.br, estrutura do EmailService e fluxos de e-mail transacional.
---

# ✉️ Resend — Infraestrutura de E-mails Transacionais

Relacionado: [[00-INDEX]] | [[01-Arquitetura/Dominios-DNS-e-Roteamento]]

## 1. Configuração de Domínio e Remetente

- **Provedor**: **Resend** (operando sobre Amazon SES na região `sa-east-1` — São Paulo).
- **Subdomínio de envio (Return-Path / Bounce)**: `send.usepontus.com.br`
  - `MX`: `10 feedback-smtp.sa-east-1.amazonses.com.`
  - `TXT (SPF)`: `"v=spf1 include:amazonses.com ~all"`
- **Assinatura DKIM**: `resend._domainkey.usepontus.com.br`
- **Política DMARC**: `_dmarc.usepontus.com.br` → `"v=DMARC1; p=reject;"`
- **Remetente padrão no código**: `Pontus <no-reply@usepontus.com.br>`
- **Variável de ambiente**: `RESEND_API_KEY` (obrigatória no backend, prefixo `re_`).

---

## 2. Implementação no Backend (`backend/src/infra/email/`)

- **Serviço**: `EmailService` (`backend/src/infra/email/email.service.ts`) implementado como Singleton (`EmailService.getInstance()`).
- **Templates**: `backend/src/infra/email/templates/invitation.ts`.

### Fluxos Atuais
1. **Convite de Membro da Equipe (`sendInvitation`)**:
   - Disparado pelo módulo `usuarios` quando o `admin` do restaurante convida um `operador` ou outro `admin`.
   - Gera um token `uuid` na tabela `invitations` e envia o link:
     `${env.FRONTEND_URL}/convites/aceitar?token=${token}`
   - Assunto: `Convite para participar da equipe: ${tenantName}`.

2. **E-mails de Autenticação (Supabase Auth)**:
   - Confirmação de cadastro e recuperação de senha utilizam o fluxo de autenticação do Supabase Auth (configurado no painel do Supabase, idealmente conectado ao SMTP do Resend com o mesmo domínio `usepontus.com.br`).
