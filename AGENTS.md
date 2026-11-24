# 🧠 Instruções para Agentes de IA — Projeto Pontus (`usepontus.com.br`)

Este repositório possui um **Segundo Cérebro (Obsidian Vault)** localizado na pasta [`brain/`](./brain/).

## Regras Obrigatórias Antes de Implementar

1. **Leia o Índice Primeiro**:
   - Antes de fazer buscas extensas no código ou planejar qualquer alteração, leia [`brain/00-INDEX.md`](./brain/00-INDEX.md).
2. **Carregamento Seletivo (Economia de Tokens)**:
   - A partir do `brain/00-INDEX.md`, leia **apenas** as notas de `brain/` diretamente relacionadas ao escopo da tarefa solicitada.
3. **Fonte de Verdade Visual**:
   - Siga exclusivamente [`brain/04-Produto-e-Design/Identidade-Visual-e-UI.md`](./brain/04-Produto-e-Design/Identidade-Visual-e-UI.md) e `frontend/src/app/globals.css` (paleta Verde `#006323` / `#2E9B4F`, Laranja `#E8762C`, fontes `Plus Jakarta Sans` e `Inter`).
4. **Mantenha o Cérebro Atualizado**:
   - Sempre que alterar regras de negócio, variáveis de ambiente, schema do banco (`schema.ts`), integrações (Supabase, Stripe, Resend, Tags) ou rotas, atualize a nota correspondente em `brain/` e registre um resumo curto em [`brain/05-Operacao/Log-de-Sessoes.md`](./brain/05-Operacao/Log-de-Sessoes.md).
