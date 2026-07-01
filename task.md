# Ajustes da Tela de Login e Correção de Cache

- `[x]` 1. Alterar UI do Login Administrativo (`/login`) para um fundo predominantemente claro, integrando melhor o design com o resto da aplicação.
- `[x]` 2. Corrigir Bug de Carregamento (Race Condition) no Painel do Cliente (`/painel`).
  - Injetar Token de modo Síncrono no `consumer-auth-form.tsx`.
  - Limpar cache antigo (`removeQueries`) no momento do login.
- `[x]` 3. Validação final de lint e build (`typecheck`).

# Padronização e Responsividade nas Telas de Autenticação
- `[x]` 1. Alinhamento da Tela de Cadastro (`/cadastro`) com a linguagem visual e estrutura de Login.
- `[x]` 2. Implementação do Gradiente Sutil e Institucional para fundos das áreas de Autenticação.
- `[x]` 3. Correção de sobreposição responsiva (Mobile-first) em elementos absolutos, como o botão "Voltar".

# Proteção de Rota e Correção de Avisos no Portal do Cliente
- `[x]` 1. Criação do `ConsumerAuthGuard` para validar a sessão ativa e bloquear acessos indevidos.
- `[x]` 2. Inserção do Guard no `layout.tsx` do consumidor (bloqueio do acesso anônimo pela landing page).
- `[x]` 3. Remoção do `priority` nas imagens de logo ocultas no Desktop para eliminar os *Warnings* de *preload* no console.

# Correção da Falha de Autenticação ("Deslogado Imediatamente")
- `[x]` 1. Investigar comportamento de Sessões Concorrentes (Admin vs Consumidor) no SDK do Supabase.
- `[x]` 2. Adicionar `supabase.auth.signOut()` explícito antes do `setSession` do consumidor para impedir falhas silenciosas na injeção da sessão.
- `[x]` 3. Remover `AuthProvider` (Lojista) do layout global `(auth)/layout.tsx` e acoplá-lo especificamente à página `/login` para cessar interferências e deslogamentos automáticos do consumidor.
