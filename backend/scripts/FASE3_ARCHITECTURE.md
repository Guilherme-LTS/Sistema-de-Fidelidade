# FASE 3: ARQUITETURA DE ENDPOINTS PÚBLICOS

**Status**: Planejamento  
**Data**: 7 de Abril de 2026

---

## 📋 Objetivo da Fase 3

Completar a arquitetura multi-tenant implementando endpoints públicos que permitam:
1. Clientes finais consultarem seus saldos de pontos
2. Clientes finais visualizarem recompensas disponíveis
3. Operadores criarem novos usuários (admin e operador) por tenant
4. Frontend consumir dados com payload correto

---

## 🎯 Tarefas Fase 3

### Fase 3.1: Endpoints Públicos

#### Decisão de Design: `/public/pontos/:document`

**Arquivo**: `backend/src/modules/public/public.routes.ts`

**Problema Atual**: 
- Rota retorna 404 mesmo para clientes válidos (RLS bloqueando)
- RLS requer JWT com tenant_id, mas público não tem autenticação

**3 Opções Arquiteturais**:

**Opção A** - Tenant via Query Parameter (RECOMENDADA)
```typescript
GET /public/pontos/12345678901?tenant_id=00000000-0000-0000-0000-000000000000
```
- Pros: Simples, cliente passa tenant
- Cons: Tenant_id exposto na URL

**Opção B** - Tenant via QR Code/Slug  
```typescript
GET /public/pontos/12345678901?tenant_slug=restaurante-semente
```
- Pros: Tenant não exposição como UUID
- Cons: Requer tabela de mapping slug → tenant_id

**Opção C** - JWT Opcional mas com Tenant
```typescript
POST /public/pontos
{
  "document": "12345678901",
  "tenant_id": "00000000-0000-0000-0000-000000000000"
}
```
- Pros: Body estruturado, flexível
- Cons: Quebra convenção GET para queries

**Recomendação**: **Opção A** - Simples de implementar, claramente multi-tenant.

#### Implementação Recomendada

```typescript
// backend/src/modules/public/public.routes.ts

router.get('/pontos/:document', async (req: Request, res: Response) => {
  const { document } = req.params;
  const { tenant_id } = req.query;
  
  // Validação
  if (!document || !tenant_id) {
    return res.status(400).json({ error: 'document e tenant_id são obrigatórios' });
  }
  
  try {
    const client = await pool.connect(); // Direct pool, NOT queryWithRLS
    
    // Query pública - sem RLS
    const customerRes = await client.query(
      `SELECT id, document, name, (
        SELECT SUM(remaining_points) FROM transactions 
        WHERE customer_id = customers.id 
        AND tenant_id = $2
        AND available_at <= NOW()
        AND expires_at > NOW()
      ) as saldo_disponivel FROM customers 
      WHERE document = $1 AND tenant_id = $2`,
      [document.replace(/\D/g, ''), tenant_id]
    );
    
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    res.json(customerRes.rows[0]);
    client.release();
  } catch (error) {
    console.error('Erro ao consultar pontos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
```

**SQL Alternatedo com agregação melhorada**:
```sql
SELECT 
  c.id,
  c.document,
  c.name,
  COALESCE(SUM(t.remaining_points), 0) as saldo_disponivel,
  MAX(t.expires_at) as prox_vencimento
FROM customers c
LEFT JOIN transactions t ON c.id = t.customer_id
  AND t.tenant_id = $2
  AND t.available_at <= NOW()
  AND t.expires_at > NOW()
WHERE c.document = $1 AND c.tenant_id = $2
GROUP BY c.id, c.document, c.name
```

---

### Fase 3.2: GET `/recompensas` (Pública)

**Arquivo**: `backend/src/modules/recompensas/recompensas.routes.ts`

**Problema Atual**:
- GET /recompensas usa RLS (requer auth)
- Precisa de versão pública sem autenticação

**Solução**:
```typescript
// Rota pública (sem auth necessária)
router.get('/publica/:tenant_id', async (req: Request, res: Response) => {
  const { tenant_id } = req.params;
  
  const client = await pool.connect(); // Direct pool
  
  const rewardsRes = await client.query(
    `SELECT id, name, description, points_cost, is_active 
     FROM rewards 
     WHERE tenant_id = $1 AND is_active = TRUE
     ORDER BY points_cost ASC`,
    [tenant_id]
  );
  
  res.json(rewardsRes.rows);
  client.release();
});

// Rota autenticada (existente com auth)
router.get('/', verificaToken, async (req: Request, res: Response) => {
  // ... código existente
});
```

**Changes necessárias**:
- Manter GET / com autenticação (para admin/operador)
- Adicionar GET /publica/:tenant_id sem autenticação
- Testar isolamento entre tenants

---

### Fase 3.3: Operadores CRUD (POST /admin/usuarios)

**Status Atual**: ✅ Já implementado em admin.routes.ts

**Validação Necessária**:
1. Endpoint POST /admin/usuarios cria tenant_users corretamente
2. Apenas admins podem criar novos operadores
3. Novos usuarios recebem tenant_id do criador

**Teste Manual**:
```bash
curl -X POST http://localhost:3001/admin/usuarios \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Novo Operador",
    "email": "operador@example.com",
    "role": "operador"
  }'
```

**Esperado**: Usuário criado com empresa (tenant_id) do admin que criou.

---

### Fase 3.4: Alignamento Frontend - Payload Contract

**Problemas Identificados**:

1. **Coluna `name` vs `nome`**
   - Backend: `{ "name": "..." }`
   - Frontend: Espera `{ "nome": "..." }`

2. **Recompensas Structure**
   - Backend: `{ id, name, points_cost, is_active }`
   - Frontend: Pode esperar `{ id, rec_nome, custo_pontos, ativo }`

**Solução Recomendada**: Verificar consumo no frontend e alinhar com backend.

**Locais Frontend para verificar**:
```
frontend/src/features/
- Dashboard.tsx (consume transacoes, recompensas)
- ConsultaSaldo.js (consome saldo public)
- CadastroPage.tsx (signup)
```

---

## 📊 Estimativa de Esforço

| Tarefa | Esforço | Prioridade |
|--------|---------|-----------|
| Fase 3.1 - GET /public/pontos/:document (Opção A) | 1-2h | CRÍTICA |
| Fase 3.2 - GET /recompensas/publica/:tenant_id | 30min | ALTA |
| Fase 3.3 - Validação POST /admin/usuarios | 30min | MÉDIA |
| Fase 3.4 - Frontend payload alignment | 1-2h | ALTA |
| **Total** | **3.5-6h** | - |

---

## 🔗 Dependências

- Fase 2 Validação: ✅ **COMPLETA**
- Backend rodando: ✅ **VERIFICADO** (npm start na porta 3001)
- Database multi-tenant schema: ✅ **ATIVO**

---

## 🎯 Próximas Ações

**Imediato (Próximas 30 minutos)**:
1. Implementar GET /public/pontos/:document (Opção A)
2. Testar endpoint públic sin auth
3. Verificar isolamento entre tenants

**Curto Prazo (Próxima 1-2 horas)**:
1. Implementar GET /recompensas/publica/:tenant_id
2. Validar POST /admin/usuarios
3. Revisar consumo no frontend

**Médio Prazo (Próximas 3-4 horas)**:
1. Alinhar payload contract frontend-backend
2. Testes ponta-a-ponta (signup → login → transação → pontos)
3. Testes end-to-end com múltiplos tenants

---

## 📝 Notas Importantes

### RLS vs Direct Queries
- **Endpoints Protegidos** (requerem auth): Use `queryWithRLS` + middleware `verificaToken`
- **Endpoints Públicos** (sem auth): Use `pool.connect()` direto + SEMPRE filtrar por `tenant_id` no WHERE

### Segurança Pública
⚠️ **Nunca confiar no tenant_id do cliente!** Sempre:
1. Receber tenant_id como parâmetro (query/body)
2. Validar que resultado pertence ao tenant solicitado
3. Usar LIMIT 1 em queries de documento único

---

## ✅ Checklist Fase 3

- [ ] GET /public/pontos/:document implementado
- [ ] GET /recompensas/publica/:tenant_id implementado
- [ ] POST /admin/usuarios validado
- [ ] Frontend payload alignado
- [ ] Testes HTTP com cliente público (sem token)
- [ ] Testes HTTP com múltiplos tenants
- [ ] QA: Isolamento entre tenants confirmado
- [ ] Documentação atualizada

---

**Fase 2 Status**: ✅ APROVADO  
**Próxima Fase**: 🚀 PRONTO PARA INICIAR
