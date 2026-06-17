# QA Visual Final - Pacote Branco e Verde

Data: 2026-04-15
Escopo: paginas publicas e navbar autenticada
Build: OK (npm run build)

## Objetivo
Validar consistencia visual final das telas alteradas, com foco em:
- fundo branco
- identidade verde
- ausencia de preto/amarelo/roxo remanescentes
- responsividade (desktop e mobile)
- navegacao visual coerente

## Rotas para validacao
- /meus-pontos
- /login
- /cadastro
- /admin/dashboard
- /admin/operacoes
- /admin/clientes
- /admin/premios
- /admin/configuracoes
- /admin/auditoria
- /admin/usuarios

## Breakpoints recomendados
- Desktop: 1440x900
- Tablet: 1024x768
- Mobile: 390x844

## Checklist por pagina

### 1) /meus-pontos
Arquivos alterados:
- src/pages/LandingPage.js
- src/pages/LandingPage.module.css

Criterios:
- [ ] Fundo geral totalmente branco
- [ ] Topo com logo provisoria (/logo192.png)
- [ ] Sem blocos pretos ou gradientes escuros
- [ ] Sem destaque amarelo no cabecalho
- [ ] Sem textos em roxo
- [ ] Cards de estabelecimentos com contraste legivel
- [ ] Tela de detalhe (extrato/resgates) sem quebra de layout
- [ ] Mobile sem overflow horizontal

Evidencias:
- [ ] Desktop: estado login
- [ ] Desktop: lista de parceiros
- [ ] Desktop: detalhe parceiro
- [ ] Mobile: estado login
- [ ] Mobile: lista
- [ ] Mobile: detalhe

### 2) /login
Arquivos alterados:
- src/features/auth/LoginPage.tsx

Criterios:
- [ ] Fundo branco
- [ ] Icone e CTA em verde
- [ ] Link de voltar com hover verde
- [ ] Card central sem clipping
- [ ] Mobile sem vazamento lateral

Evidencias:
- [ ] Desktop
- [ ] Mobile

### 3) /cadastro
Arquivos alterados:
- src/features/auth/CadastroPage.tsx

Criterios:
- [ ] Fundo branco
- [ ] Container com overflow-x oculto
- [ ] Formulario sem cortes em mobile
- [ ] Botao principal verde
- [ ] Footer do card alinhado e legivel

Evidencias:
- [ ] Desktop
- [ ] Mobile

### 4) /admin/dashboard
Arquivos alterados:
- src/features/Dashboard.tsx

Criterios:
- [ ] Sem roxo/laranja nos indicadores principais
- [ ] Grafico com paleta verde consistente
- [ ] Cartoes sem regressao de contraste
- [ ] Lista de top clientes legivel e clicavel
- [ ] Responsivo: grafico nao quebra em telas menores

Evidencias:
- [ ] Desktop
- [ ] Mobile

### 5) Navbar autenticada (todas as rotas /admin/*)
Arquivos alterados:
- src/shared/layouts/Layout.tsx

Criterios:
- [ ] Marca com logo provisoria no sidebar
- [ ] Item ativo com fundo verde claro
- [ ] Itens adminOnly ocultos para perfil operador
- [ ] Sem itens com visual quebrado no mobile drawer
- [ ] Botao sair com hierarquia visual correta

Evidencias:
- [ ] Desktop admin
- [ ] Desktop operador
- [ ] Mobile admin (menu aberto)

## Checklist de regressao rapida
- [ ] Toasts continuam visiveis (tema light)
- [ ] Nao ha flicker visual ao trocar rotas principais
- [ ] Nenhuma tela com fundo escuro indevido
- [ ] Sem elementos fora da viewport em 390px de largura
- [ ] Build continua verde

## Resultado final
Status geral:
- [ ] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

Observacoes finais:
-
-
-
