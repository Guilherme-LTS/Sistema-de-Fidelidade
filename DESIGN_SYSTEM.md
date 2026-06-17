# Design System — Sistema de Fidelidade B2B

**Versão**: 1.0 Draft  
**Status**: Em Desenvolvimento (Fase 1: Design Tokens ✅)  
**Última Atualização**: Abril 2026

---

## 📌 Visão Geral

Este Design System define os padrões visuais, de interação e comportamento para a **Plataforma de Fidelidade B2B** — uma solução premium para restaurantes upscale gerenciarem programas de lealdade baseados em pontos.

### Posicionamento
- **Mercado**: B2B (restaurantes como clientes operadores)
- **Segmento**: Fine Dining & Upscale Restaurants
- **Tom**: Profissional, Formal, Data-Driven
- **Diferenciais**: Inteligência artificial, relatórios premium, interface intuitiva

### Princípios de Design
1. **Confiança» — Cores e tipografia transmitem profissionalismo
2. **Clareza** — Informações sem ruído visual
3. **Eficiência** — Operadores de restaurante precisam executar ações rápidas
4. **Acessibilidade** — WCAG AA mínimo (contrast ratio ≥ 4.5:1)
5. **Escalabilidade** — Componentes reutilizáveis, fácil manutenção

---

## 🎨 Paleta de Cores

### Primária: Teal (Confiança, Premium)

```
Teal Principal:   #0F766E (RGB: 15, 118, 110)
├─ Hover/Focus:   #0B5F58 (darkened)
└─ Light Variant: #D8EFE8 (backgrounds)
```

**Uso**:
- Botões principais (CTA)
- Headers e bars
- Links de navegação
- Focus states
- Status positivos

**Referência**: Paleta de sucesso da Fidelizi (competitor)

---

### Secundária: Gold/Amarelo (Energia, Diferenciação)

```
Gold Principal:   #F4C542 (RGB: 244, 197, 66)
└─ Soft:          #FFE768 (lighter variant)
```

**Uso**:
- Badges e tags
- Pontos e rewards visuais (destaque)
- Destaques secundários
- Callouts de atenção
- Elementos de micro-interação (hover)

**Razão**: Quente, diferenciador, compatível com teal

---

### Terciária: Violeta (Ênfase)

```
Violeta:          #6B4FC8
└─ Light:         #A894DB
```

**Uso**:
- Gráficos
- Categorias
- Elementos de destaque especial

---

### Semânticas (Feedback)

| Tipo | Cor | Uso |
|------|-----|-----|
| **Success** | `#1F8A52` (Verde) | Operações bem-sucedidas, confirmações |
| **Warning** | `#D97706` (Âmbar) | Avisos, atenção necessária |
| **Danger** | `#DC2626` (Vermelho) | Erros, deletar, rejeitar |
| **Info** | `#0369A1` (Azul) | Informações neutras, tooltips |

---

### Neutras (Backgrounds & Text)

| Elemento | Cor | Uso |
|----------|-----|-----|
| **Background Geral** | `#F8F9FB` | Fundo principal das páginas |
| **Surface** | `#FFFFFF` | Cards, modals, surfaces |
| **Surface Alt** | `#F3F5F9` | Superfícies alternativas |
| **Border** | `#D7DEEA` | Bordas padrão |
| **Border Light** | `#E5E7EB` | Bordas mais suaves |
| **Texto Principal** | `#1F2937` | Body text, headings |
| **Texto Secundário** | `#667085` | Meta info, descriptions |
| **Texto Muted** | `#9CA7CB` | Hints, labels pequenos |

---

## 🔤 Tipografia

### Famílias

#### **Heading: `Sora`** (Premium, Compact)
- **Uso**: H1–H6, Títulos de seções, Headlines
- **Variantes**: 600 (semi-bold), 700 (bold)
- **Letter-spacing**: -0.02em (premium feel, mais compacto)
- **Fallback**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

#### **Body: `Manrope`** (Clean, Modern)
- **Uso**: Paragráfos, inputs, buttons, labels
- **Variantes**: 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)
- **Letter-spacing**: normal (0)
- **Fallback**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Escala Tipográfica

| Nível | Tamanho | Família | Weight | Line-Height | Uso |
|-------|---------|---------|--------|-------------|-----|
| H1 | 2.6rem (42px) | Sora | 700 | 1.2 | Títulos de página |
| H2 | 2.2rem (35px) | Sora | 700 | 1.25 | Seções principais |
| H3 | 1.8rem (29px) | Sora | 600 | 1.3 | Subtítulos |
| H4 | 1.5rem (24px) | Sora | 600 | 1.35 | Seções pequenas |
| **Body L** | 1.125rem (18px) | Manrope | 400 | 1.5 | Introduções, corpo longo |
| **Body M** | 1rem (16px) | Manrope | 400 | 1.45 | Corpo padrão |
| **Body S** | 0.875rem (14px) | Manrope | 400 | 1.4 | Texto secundário |
| **Label** | 0.75rem (12px) | Manrope | 500 | 1.35 | Labels, badges |
| **Button** | 1rem (16px) | Manrope | 600 | 1.2 | Button text |

### Weights Padrão

- `400` — Regular (corpo, descrições)
- `500` — Medium (labels, highlights leves)
- `600` — Semi-bold (ênfase, botões)
- `700` — Bold (headings, destaques)
- `800` — Extra bold (very rare)

---

## 📦 Componentes Principais

### Button (4 Variantes)

#### Primary
```css
background: var(--color-primary); /* #0F766E */
color: white;
padding: 0.75rem 1.5rem;
border-radius: 8px;
font-weight: 600;
font-size: 1rem;
transition: all 180ms ease;

&:hover {
  background: var(--color-primary-dark); /* #0B5F58 */
  box-shadow: 0 8px 24px rgba(15, 118, 110, 0.2);
}

&:active {
  transform: translateY(1px);
}

&:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

#### Secondary
```css
background: white;
color: var(--color-primary);
border: 1px solid var(--color-primary);
padding: 0.75rem 1.5rem;
/* ... outras props como primary ... */
```

#### Tertiary (Text-only)
```css
background: transparent;
color: var(--color-primary);
border: none;
/* ... */

&:hover {
  background: var(--color-primary-light); /* #D8EFE8 */
}
```

#### Danger
```css
background: var(--color-danger); /* #DC2626 */
color: white;
/* ... */
```

### Card

```css
background: var(--color-surface); /* white */
border: 1px solid var(--color-border); /* #D7DEEA */
border-radius: 12px;
padding: 1.5rem;
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
transition: all 180ms ease;

&:hover {
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.1);
}
```

### Input/Form Fields

```css
border: 1px solid var(--color-border); /* #D7DEEA */
border-radius: 8px;
padding: 0.75rem 1rem;
font-family: var(--font-body);
font-size: 1rem;
color: var(--color-text);

&:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

&:disabled {
  background: var(--color-surface-alt);
  cursor: not-allowed;
  opacity: 0.6;
}
```

### Badge/Status

```
✅ Success: green bg + green text (light)
⚠️ Warning: amber bg + amber text (light)
❌ Danger: red bg + red text (light)
ℹ️ Info: blue bg + blue text (light)

border-radius: 20px (pill-shaped)
padding: 0.25rem 0.75rem
font-size: 12px
font-weight: 600
```

### Modal/Dialog

```css
/* Overlay */
background: rgba(0, 0, 0, 0.5);
position: fixed;
z-index: 1040;

/* Content */
background: white;
border-radius: 16px;
box-shadow: 0 16px 48px rgba(0, 0, 0, 0.1);
max-width: 500px;
padding: 2rem;

/* Header */
border-bottom: 2px solid var(--color-primary);
padding-bottom: 1rem;
margin-bottom: 1.5rem;
```

### Table

```css
header {
  background: var(--color-primary-light); /* #D8EFE8 */
  color: var(--color-text);
  font-weight: 600;
  border-bottom: 1px solid var(--color-border);
}

tbody tr:hover {
  background: #F9FAFB;
}

border: none (horizontal lines only)
vertical-align: top
```

---

## 🎴 Espaçamento — Sistema 8px

Base: **8px**

```
xs    =  4px    (0.25rem)
sm    =  8px    (0.5rem)
md    = 12px    (0.75rem)
lg    = 16px    (1rem)       ← DEFAULT padding/margin
xl    = 24px    (1.5rem)     ← Large spacings
2xl   = 32px    (2rem)       ← Section gaps
3xl   = 48px    (3rem)       ← Page sections
4xl   = 64px    (4rem)       ← Major layout
```

### Aplicação

- **Cards**: Padding `1.5rem` (lg)
- **Buttons**: Padding `0.75rem 1.5rem` (vertical sm, horizontal lg)
- **Section gaps**: `2rem` (2xl)
- **Form gaps**: `1.5rem` (xl) entre campos
- **Grid gaps**: `1.5rem` (xl) entre colunas

---

## 🎨 Rounded Corners (Border Radius)

```
sm  = 8px     (small components: inputs, badges)
md  = 12px    (cards, containers)
lg  = 16px    (modals, major containers)
xl  = 20px    (special containers)
full = 9999px (avatars, circles)
```

**Padrão**: Use `md` (12px) como default

---

## 🌑 Shadows — Profundidade

```
xs   = 0 1px 2px rgba(0,0,0,0.05)
sm   = 0 2px 4px rgba(0,0,0,0.08)
md   = 0 8px 24px rgba(0,0,0,0.08)   (Cards, Standard)
lg   = 0 16px 48px rgba(0,0,0,0.1)   (Modals, Floating)
xl   = 0 24px 64px rgba(0,0,0,0.12)  (Popovers, Alerts)
```

**Regra**: 
- Cards por padrão = `md`
- Hover cards = `lg`
- Modals + dropdowns = `lg` ou `xl`

---

## ⏱️ Transições & Animações

### Durations

```
fast       = 150ms (micro-interactions)
base       = 180ms (padrão)
slow       = 250ms (page transitions)
very-slow  = 350ms (modals enter)
```

### Timing Function

```
ease       = cubic-bezier(0.4, 0, 0.2, 1)  (standard)
ease-in    = cubic-bezier(0.4, 0, 1, 1)    (accelerate)
ease-out   = cubic-bezier(0, 0, 0.2, 1)    (decelerate)
```

### Propriedades Animadas

- `background-color`
- `border-color`
- `box-shadow`
- `color`
- `transform` (only translate, scale — nunca 3D)
- `opacity`

### Exemplo

```css
button {
  transition: all var(--transition-base);
}

button:hover {
  background-color: var(--color-primary-dark);
  box-shadow: 0 8px 24px rgba(15, 118, 110, 0.2);
}
```

---

## 📱 Responsive Breakpoints

```
Mobile:     < 640px   (default)
Tablet:     640px - 900px
Desktop:    900px+
Large:      1200px+
```

### Estratégia: Mobile-First

1. Escreva CSS padrão para mobile (100% width, 1 coluna)
2. Adicione media queries para enlarge em breakpoints maiores

```css
.container {
  width: 100%;
  padding: 1rem;
}

@media (min-width: 900px) {
  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
}
```

---

## ♿ Acessibilidade

### Contrast Ratio (WCAG AA)

- **Texto na cor primária**: `#0F766E` no fundo branco
  - Ratio: **4.5:1** ✅ (WCAG AA approved)
- **Texto em grifado (highlight)**: Sempre manter ≥ **7:1** quando possível

### Focus States

Todos os elementos interativos devem ter visible focus:

```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### Labels & ARIA

```html
<!-- ✅ Bom -->
<label for="input-name">Nome do Restaurante</label>
<input id="input-name" type="text" />

<!-- ❌ Evitar -->
<input type="text" placeholder="Nome do Restaurante" />

<!-- ✅ Buttons com ícones -->
<button aria-label="Fechar modal">✕</button>
```

### Preferências do Usuário

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 🗂️ Estrutura de Arquivos (Frontend)

```
frontend/src/
├── styles/
│   ├── design-tokens.css          ⭐ Design Tokens (FONTE DE VERDADE)
│   └── ...
├── index.css                      ← Importa design-tokens.css
├── components/
│   └── ui/
│       ├── button.tsx             ← Refatorado para usar teal
│       ├── card.tsx               ← Refatorado
│       ├── input.tsx
│       ├── badge.tsx
│       ├── table.tsx
│       ├── modal.tsx
│       ├── avatar.tsx
│       ├── alert.tsx
│       └── ...
├── features/
│   ├── auth/
│   │   ├── LoginPage.tsx          ← Refatorar (Fase 3)
│   │   └── LoginPage.module.css   ← Remover colors hardcoded
│   ├── DashboardPage.tsx          ← CRÍTICO (Fase 3)
│   └── ...
└── tailwind.config.js             ← Estendido com paleta
```

---

## 📝 CSS Modules — Melhores Práticas

### ✅ Sempre Use Variáveis

```css
/* ✅ BOM */
.button {
  background-color: var(--color-primary);
  padding: var(--space-lg);
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}
```

### ❌ Nunca Hardcode

```css
/* ❌ RUIM — Será detectado e refatorado */
.button {
  background-color: #0f766e;   /* Use var(--color-primary) */
  padding: 16px;                /* Use var(--space-lg) */
  border-radius: 8px;          /* Use var(--radius-sm) */
}
```

### Naming Convention

```css
.componentName { }
.componentName-variant { }
.componentName-modifier { }

Exemplo:
.card { }
.card-elevated { }
.card-disabled { }

.button { }
.button-primary { }
.button-primary-disabled { }
```

---

## 🚀 Como Usar Este Design System

### 1. Para Desenvolvedores

#### Importar Tokens
```typescript
// Automático! Os tokens estão em :root do CSS global
// Use direto: var(--color-primary), var(--space-lg), etc.
```

#### Utilizar Componentes UI
```typescript
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import Input from '@/components/ui/input';

export function MyComponent() {
  return (
    <Card>
      <Input label="Email" type="email" />
      <Button variant="primary">Enviar</Button>
    </Card>
  );
}
```

#### Estilizar com CSS Modules
```typescript
import styles from './MyComponent.module.css';

export function MyComponent() {
  return <div className={styles.container}>...</div>;
}
```

```css
/* MyComponent.module.css */
.container {
  background: var(--color-surface);
  padding: var(--space-xl);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
```

### 2. Para Designers

- Referência de cores, tipografia, componentes está aqui neste arquivo
- Componentes visuais em: `DESIGN_SYSTEM_VISUAL.html` (em breve)
- Ícones: Usar biblioteca `lucide-react` (já instalada)

### 3. Para Novos Contribuidores

1. Leia este arquivo
2. Verifique se sua mudança usa variáveis CSS (não hardcoded)
3. Teste responsividade em 3 breakpoints (mobile, tablet, desktop)
4. Execute `npm run lint` antes de fazer commit

---

## ✅ Checklist de Refatoração (Fase 3+)

Para cada page/component refatorado:

- [ ] Remover todas as cores hardcoded (use `var(--color-*)`)
- [ ] Remover todos os tamanhos hardcoded (use `var(--space-*)`)
- [ ] Verificar tipografia (headings = Sora, body = Manrope)
- [ ] Adicionar focus states visíveis
- [ ] Testar responsividade (< 640px, 640-900px, > 900px)
- [ ] Validar contrast ratio para acessibilidade
- [ ] `npm run build` → sem erros
- [ ] `npm run lint` → sem warnings de colors
- [ ] Testar no navegador (Chrome, Firefox, Safari)

---

## 🔄 Versionamento & Mudanças

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0 Draft | Abr 2026 | Design Tokens criados, componentes definidos |
| 1.1 (TODO) | TBD | Componentes refatorados, dark mode preparado |
| 2.0 (TODO) | TBD | Dark mode implementado |

---

## 📞 Contato & Feedback

Dúvidas sobre o Design System?
- Abra uma issue no GitHub com tag `design-system`
- Contribuições são bem-vindas!

---

**Last Updated**: Abril 2026  
**Maintained By**: Frontend Team  
**Status**: Em Desenvolvimento (Fase 1 ✅ → Fase 2 🔄)
