---
title: Roadmap de Produto e Ideias Futuras
tags:
  - pontus
  - produto
  - roadmap
  - ideias
updated: 2026-11-23
summary: Consolidação das ideias de evolução de produto (Ideias_Futuras.txt e README.md) para próximas sprints da Pontus.
---

# 🚀 Roadmap de Produto e Ideias Futuras

Relacionado: [[00-INDEX]] | [[03-Regras-de-Negocio/Pontos-Resgates-e-Expiracao]]

## 1. Novas Features de Produto (`Ideias_Futuras.txt`)

Ideias estratégicas anotadas para expansão do produto e aumento de valor percebido:

1. **Totem / Display NFC na Mesa ou Caixa + Avaliação do Restaurante**:
   - O cliente aproxima o celular da tag **NFC** no restaurante.
   - Abre um formulário rápido (identificado pelo `slug` do restaurante) onde o cliente preenche seus dados/avaliação e envia para o banco.
   - **Gamificação de Avaliação**: O cliente avalia a experiência no restaurante (nota/comentário) e **ganha +1 ponto** automaticamente no programa de fidelidade daquele estabelecimento.
2. **Módulo de Ponto de Venda (PDV)**:
   - Criar uma interface de PDV integrada ao lançamento de pontos para facilitar ainda mais a operação de balcão.
3. **Evolução para ERP de Restaurantes**:
   - Expandir a partir do PDV + Fidelidade para um **ERP enxuto para restaurantes**, podendo vender o ERP como produto principal ou upsell de ticket maior.

---

## 2. Melhorias Comerciais, Marketing e Escala

- **Tags de Conversão e Tráfego Pago**:
  - Instalar Google Tag Manager (GTM), GA4 e Meta Pixel na Landing Page (`www.usepontus.com.br`) e no funil de cadastro/checkout (`app.usepontus.com.br`). Veja [[02-Infra-e-Integracoes/Tags-SEO-e-Analytics]].
- **Comunicação Ativa com Consumidores (Resend / WhatsApp)**:
  - Notificações automáticas por e-mail (ou WhatsApp futuro) quando pontos estiverem próximos de expirar (`pontos_expirando` em 30 dias) ou quando o cliente atingir saldo suficiente para resgatar um prêmio.
- **Rotinas de Backup e Observabilidade (do `README.md`)**:
  - Backups automáticos / Point-in-Time Recovery no Supabase.
  - Integração dos logs estruturados Pino com ferramenta de monitoramento.
