# Relatório de Validação - Consumer Profiles e RLS

**Data:** 15/04/2026  
**Branch:** `Ambiente-Dev`  
**Escopo:** backend + frontend de consumo público

## Status atual

O núcleo da implementação já está pronto para testes:

- Migration 012 cria `consumer_profiles` e vincula `customers` via `consumer_profile_id`.
- Migration 013 habilita RLS em `consumer_profiles`.
- O backend já usa helpers centrais para resolver e atualizar cliente/perfil.
- As rotas públicas de saldo e extrato já foram ajustadas para o novo modelo.
- O backend compila com sucesso após a última alteração.

## O que ainda vale conferir antes de encerrar a fase

Não há bloqueio estrutural óbvio no código atual. O que ainda precisa de validação é operacional:

- Fluxo público `/meus-pontos` e `/p/:tenantSlug` no navegador.
- Consulta de saldo público com CPF válido e tenant resolvido.
- Consulta de extrato público para tenant específico.
- Resgate de recompensa com payload `recompensa_id`.
- Cadastro e lançamento de pontos com vínculo correto ao `consumer_profiles`.

## Pontos de atenção

- O frontend público e o portal do cliente precisam ser testados com dados reais, porque o contrato agora depende de `customer_name`, `pontos_disponiveis`, `pontos_pendentes`, `data_proxima_liberacao` e `data_proxima_expiracao`.
- O backend público usa `pool` direto por design, mas agora filtra por tenant e por documento usando o modelo híbrido com fallback.
- Se algum registro antigo ainda não tiver `consumer_profile_id`, o fallback mantém a leitura funcionando.

## Checklist de testes recomendados

### Backend

1. `cd backend && npm run build`
2. Subir a API localmente.
3. Testar `GET /public/pontos/:document` com e sem `tenant_id`.
4. Testar `GET /public/extrato/:document?tenant_id=...`.
5. Testar `POST /transacoes` com CPF válido e verificar criação/atualização de perfil.
6. Testar `POST /resgates` com `recompensa_id` e saldo suficiente.

### Frontend

1. `cd frontend && npm run build`
2. Abrir `/meus-pontos` e validar login/cadastro local.
3. Abrir `/p/:tenantSlug` e validar resolução do tenant.
4. Selecionar um parceiro e conferir saldo + extrato + recompensas.
5. Validar que não há quebra visual em desktop e mobile.

## Resultado esperado

Se os testes acima passarem, podemos considerar a fase atual consolidada e seguir para a próxima rodada de ajustes finos ou integração ponta a ponta.

## Resumo executivo

O trabalho principal já está implementado. Falta principalmente validação em ambiente real, não mais refatoração estrutural.

---

## Execução complementar - 16/04/2026

### 1) Correção de isolamento aplicada

Foram aplicadas correções para não depender exclusivamente de RLS:

- Filtro explícito por `tenant_id` no dashboard em [backend/src/modules/dashboard/dashboard.routes.ts](backend/src/modules/dashboard/dashboard.routes.ts).
- Filtro explícito por `tenant_id` nas consultas de clientes em [backend/src/modules/clientes/clientes.routes.ts](backend/src/modules/clientes/clientes.routes.ts).
- Proteção com `verificaToken` adicionada em rotas de detalhe de cliente e extrato em [backend/src/modules/clientes/clientes.routes.ts](backend/src/modules/clientes/clientes.routes.ts).

Build validado com sucesso após alteração (`npm run build` no backend).

### 2) Causa raiz confirmada

Foi confirmado em runtime que a conexão atual do backend usa role com bypass de RLS:

- `current_user = postgres`
- `rolbypassrls = true`

Isso explica o comportamento de vazamento mesmo com policies existentes.

### 3) Limpeza do banco executada (tenants A e B)

Tenants limpos:

- Tenant A: `87c96e50-accb-4c33-9bd3-e1d7557c8e30`
- Tenant B: `baf829a5-d13c-487b-a77e-784be10a0aea`

Tabelas limpas: `audit_logs`, `redemptions`, `transactions`, `rewards`, `tenant_staff`, `customers` e `consumer_profiles` órfãos relacionados.

Resultado da limpeza:

- Antes: havia dados operacionais em A (clientes/pontos/resgates) e parte de dados auxiliares.
- Depois: ambas as empresas ficaram com `0` registros operacionais nas tabelas alvo.

### 4) Reteste controlado de isolamento

Cenário executado:

1. Criado cliente + saldo de 67 pontos apenas no Tenant A.
2. Consultada listagem de clientes para A e B.
3. Consultada query equivalente de dashboard top clientes para A e B.

Resultado:

- Tenant A: 1 cliente e 67 pontos visíveis.
- Tenant B: 0 clientes e 0 resultados de dashboard.

Conclusão do reteste: isolamento confirmado no cenário controlado após correções e limpeza.

### 5) Recomendação operacional

Mesmo com a correção por filtro explícito na aplicação, o ideal é ajustar também a role de conexão do backend para uma role sem `BYPASSRLS` em produção, mantendo defesa em profundidade.

---

## Auditoria Completa de Isolamento Multi-tenant - 16/04/2026 (Rodada 2)

### Escopo desta auditoria

- Verificação no banco (Supabase/Postgres) de `tenant_id`, RLS e policies por operação.
- Revisão de rotas e queries no backend para confirmar filtro explícito por tenant.
- Correção dos bugs reportados:
	- Bug 1: vazamento no log de auditoria.
	- Bug 2: vazamento de recompensas entre tenants.

### 1) Banco - estado ANTES

Resumo dos principais objetos auditados:

| Tabela | tenant_id | RLS | Policies | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---:|---|---|---|---|
| audit_logs | sim | **não** | 0 | não | não | não | não |
| rewards | sim | sim | 1 (`ALL`) | sim | sim | sim | sim |
| customers | sim | sim | 1 (`ALL`) | sim | sim | sim | sim |
| transactions | sim | sim | 1 (`ALL`) | sim | sim | sim | sim |
| redemptions | sim | sim | 1 (`ALL`) | sim | sim | sim | sim |
| tenant_settings | sim | sim | 1 (`ALL`) | sim | sim | sim | sim |
| tenant_staff | sim | sim | 1 (`ALL`) | sim | sim | sim | sim |
| tenant_users | sim | sim | 2 | sim | sim | sim | sim |
| consumer_profiles | não (global) | sim | 4 | sim | sim | sim | sim |
| tenants | não (chave do tenant) | sim | 1 (`SELECT`) | sim | não | não | não |

Observações críticas:

- `audit_logs` estava sem RLS e sem policies.
- Role de conexão atual do backend no runtime: `current_user = postgres`, `rolbypassrls = true`.

### 2) Revisão de código - problemas identificados

1. `backend/src/modules/recompensas/recompensas.routes.ts`
- `GET /recompensas` e `GET /recompensas/publica` listavam recompensas ativas sem `WHERE tenant_id = ...`, confiando apenas em RLS.

2. `backend/src/modules/admin/admin.routes.ts`
- `GET /admin/tenant_settings` buscava configurações sem filtro explícito por tenant.
- `GET /admin/usuarios` buscava `tenant_staff` sem filtro explícito por tenant.
- Fallback legado de `GET /admin/auditoria` (union de `transactions` + `redemptions`) não restringia por `tenant_id` no SQL do fallback.

### 3) Correções aplicadas

#### 3.1 Banco (RLS + policies)

Nova migration criada:

- `backend/scripts/migrations/014_fase13_audit_logs_rls_hardening.sql`

Mudanças:

- `ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;`
- Policies específicas por operação em `audit_logs`:
	- `Audit logs tenant select`
	- `Audit logs tenant insert`
	- `Audit logs tenant update`
	- `Audit logs tenant delete`

Migration aplicada com sucesso no ambiente auditado.

#### 3.2 Backend (filtro explícito por tenant)

Arquivos alterados:

- `backend/src/modules/recompensas/recompensas.routes.ts`
	- `GET /` e `GET /publica` agora exigem `tenant_id` do usuário autenticado e filtram com `WHERE tenant_id = $1`.

- `backend/src/modules/admin/admin.routes.ts`
	- `getTenantSettingsHandler` agora exige tenant e filtra `tenant_settings` por `tenant_id`.
	- `GET /admin/usuarios` agora filtra `tenant_staff` por `tenant_id`.
	- Fallback legado de `GET /admin/auditoria` agora filtra `legacy.tenant_id = ...` e reforça joins com tenant (`rewards` e `tenant_users`).

### 4) Banco - estado DEPOIS

Após a migration 014:

| Tabela | tenant_id | RLS | Policies | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---:|---|---|---|---|
| audit_logs | sim | **sim** | 4 | sim | sim | sim | sim |
| rewards | sim | sim | 1 (`ALL`) | sim | sim | sim | sim |
| customers | sim | sim | 1 (`ALL`) | sim | sim | sim | sim |
| transactions | sim | sim | 1 (`ALL`) | sim | sim | sim | sim |
| redemptions | sim | sim | 1 (`ALL`) | sim | sim | sim | sim |
| tenant_settings | sim | sim | 1 (`ALL`) | sim | sim | sim | sim |
| tenant_staff | sim | sim | 1 (`ALL`) | sim | sim | sim | sim |
| tenant_users | sim | sim | 2 | sim | sim | sim | sim |
| consumer_profiles | não (global) | sim | 4 | sim | sim | sim | sim |
| tenants | não (chave do tenant) | sim | 1 (`SELECT`) | sim | não | não | não |

### 5) Reteste direcionado dos bugs

Resultado dos retestes executados após correção:

- Bug 1 (auditoria): `Tenant A has B action? false` e `Tenant B has A action? false`.
- Bug 1 (fallback legado /admin/auditoria): sem linhas de tenant cruzado nos dois sentidos.
- Bug 2 (recompensas): query de listagem por tenant não retorna recompensa do outro tenant.

### 6) Pendências / atenção futura

1. Infraestrutura: a role atual de conexão (`postgres`) mantém `rolbypassrls = true`.
2. Mesmo com filtros explícitos no código e RLS corrigido, a recomendação forte é usar uma role de aplicação **sem** `BYPASSRLS`.
3. Esse ajuste de credencial/role deve ser tratado como prioridade antes de homologação final.