---
title: Regras de Negócio — Pontos, Resgates FIFO e Expiração
tags:
  - pontus
  - regras-de-negocio
  - fidelidade
  - fifo
  - pontos
updated: 2026-11-23
summary: Como funcionam o cálculo de pontos, prazo de carência, expiração, dedução FIFO em resgates e o cronjob de expiração.
---

# 🎯 Regras de Negócio — Pontos, Resgates FIFO e Expiração

Relacionado: [[00-INDEX]] | [[02-Infra-e-Integracoes/Supabase-DB-RLS-Storage]]

## 1. Lançamento de Pontos (`transacoes.service.ts`)

Quando o operador ou admin lança uma compra para um cliente via CPF:
1. **Validação de CPF**: Limpa pontuação e valida dígitos verificadores (`validateAndCleanCPF`).
2. **Cálculo de Conversão**:
   - Cada restaurante define `pointsConversionReal` (padrão: `R$ 1,00` = `1 ponto`).
   - Fórmula: `pontosGanhos = Math.floor(valorCompra / pointsConversionReal)`.
   - Se `pontosGanhos === 0`, retorna erro informando o valor mínimo de compra do estabelecimento.
3. **Carência e Validade**:
   - `availableAt = now + loyaltyGracePeriodDays` (padrão: `0` dias → disponível na hora).
   - `expiresAt = now + loyaltyExpirationDays` (padrão: `90` dias).
4. **Resolução Automática de Cliente + LGPD**:
   - Se o CPF já é cliente do restaurante (`customers`), lança direto.
   - Se não é cliente do restaurante, busca na base global (`consumer_profiles`):
     - **Já existe em `consumer_profiles`**: vincula automaticamente ao restaurante (`vincularPerfilExistente`) sem exigir novo aceite LGPD.
     - **Não existe em `consumer_profiles`**: exige `lgpdConsentimento === true` na requisição; cria o `consumer_profile` global (o nome é opcional, podendo ser preenchido depois pelo próprio consumidor no portal) e o vínculo em `customers`.
5. **Registro e Auditoria**:
   - Insere em `transactions` com `pointsEarned = pontosGanhos` e `remainingPoints = pontosGanhos`.
   - Grava `ADD_POINTS` em `audit_logs`.

---

## 2. Classificação do Saldo do Cliente

Em todas as consultas de saldo (`clientes.service.ts` e `consumer.routes.ts`), os pontos de cada lote (`transactions.remaining_points > 0`) são classificados em tempo real:
- **Pontos Disponíveis**: `available_at <= now()` e `expires_at > now()`.
- **Pontos Pendentes (em carência)**: `available_at > now()`.
- **Pontos Expirando**: pontos disponíveis cujo `expires_at <= now() + 30 days`.

---

## 3. Resgate de Recompensas com FIFO e Lock (`resgates.service.ts`)

1. **Transação + Row Lock Anti-Concorrência**:
   - Abre `db.transaction` e executa `SELECT id FROM customers WHERE id = ... FOR UPDATE`.
   - Impede *double-spending* caso dois cliques ou dois caixas tentem resgatar prêmios simultaneamente para o mesmo CPF.
2. **Validação de Saldo**:
   - Confere se `pontosDisponiveis >= recompensa.pointsCost`.
3. **Dedução FIFO (First-In, First-Out por data de expiração)**:
   - Busca todas as transações com `remainingPoints > 0`, `availableAt <= now` e `expiresAt > now`, ordenadas por **`expiresAt ASC`** (os pontos que vencem mais cedo são consumidos primeiro).
   - Deduz iterativamente `remainingPoints` de cada transação e grava cada abatimento na tabela de razão **`redemption_items`** (`redemptionId`, `transactionId`, `pointsDeducted`).
4. **Auditoria**: Grava `REDEEM_REWARD` em `audit_logs`.

---

## 4. Expiração Automática via Cron (`cron.controller.ts`)

- **Endpoint**: `POST /cron/expire-points` (protegido por header `Authorization: Bearer ${CRON_SECRET}`).
- **Concorrência Segura**:
  - Busca transações com `expiresAt < now()` e `remainingPoints > 0` usando `.for("update", { skipLocked: true })`.
  - Se dois workers de cron rodarem ao mesmo tempo, `SKIP LOCKED` evita processamento duplicado.
- **Rastreabilidade Contábil**:
  - Para cada lote vencido, cria um registro em `expirations`, um item em `expiration_items` apontando para a `transactionId`, zera `transactions.remainingPoints = 0` e grava `POINTS_EXPIRED` em `audit_logs`.
