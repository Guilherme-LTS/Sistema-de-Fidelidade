# 🎨 Design System Visual Reference

**Sistema de Fidelidade B2B** — Paleta de Cores, Componentes & Tipografia

---

## Paleta de Cores

### Primária: Teal (Trust, Premium)

```
███ #0F766E  PRIMARY (use em BTNs, headers, CTAs)
███ #0B5F58  PRIMARY-DARK (hover, active states)
███ #D8EFE8  PRIMARY-LIGHT (backgrounds, highlights)
```

**Uso**: Botões principais, logos, navegação, focus indicators  
**Contrast**: 4.5:1 ✅ WCAG AA Approved

---

### Secundária: Gold/Amarelo (Energy, Differentiation)

```
███ #F4C542  ACCENT (badges, rewards, emphasis)
███ #FFE768  ACCENT-LIGHT (softer variant)
```

**Uso**: Pontos visuais, badges de prêmios, destaques secundários  
**Nota**: Quente, diferenciador, compatível com teal

---

### Semânticas (Feedback)

```
███ #1F8A52  SUCCESS — Confirmações, valor positivo
███ #D97706  WARNING — Atenção, cuidado necessário
███ #DC2626  DANGER/ERROR — Erros, exclusões
███ #0369A1  INFO — Informações neutras, tooltips
```

---

### Neutras (Layout, Text)

```
███ #F8F9FB  BG-MAIN — Fundo geral (light)
███ #FFFFFF  SURFACE — Cards, modals (puro)
███ #F3F5F9  SURFACE-ALT — Backgrounds alternativos
───────────────
███ #1F2937  TEXT — Texto principal (dark)
███ #667085  TEXT-SECONDARY — Subtítulos, descrições
███ #9CA7CB  TEXT-MUTED — Hints, labels pequenos
───────────────
███ #D7DEEA  BORDER — Bordas padrão
███ #E5E7EB  BORDER-LIGHT — Bordas mais suaves
```

---

## 🔤 Tipografia

### Famílias

#### **Sora** (Headings — Premium, Compact)
```
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
0123456789
```
- **Weights**: 600 (semi-bold), 700 (bold)
- **Uso**: H1-H6, títulos, headlines
- **Letter-spacing**: -0.02em (premium feel)

#### **Manrope** (Body — Clean, Modern)
```
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
0123456789
```
- **Weights**: 400, 500, 600, 700
- **Uso**: Paragráfos, inputs, labels, buttons
- **Letter-spacing**: normal (0)

### Escala Tipográfica

```
H1  2.6rem  700  "Títulos de Página"
H2  2.2rem  700  "Seções Principais"
H3  1.8rem  600  "Subtítulos"
───
Body L  1.125rem  400  "Introduções"
Body M  1rem      400  "Padrão"
Body S  0.875rem  400  "Secundário"
Label   0.75rem   500  "Labels & Badges"
```

---

## 🎴 Componentes Principais

### Button — 4 Variantes

#### Primary (CTA Principal)
```
┌─────────────────────────┐
│ ███ Enviar              │  Teal background
│ ░░░ :hover (darker)     │
│ ┐ :focus outline        │
└─────────────────────────┘
```
- **Background**: `var(--color-primary)` = #0F766E
- **Text**: White
- **Shadow**: `var(--shadow-sm)` on hover → `var(--shadow-md)`
- **Padding**: 0.75rem 1.5rem

#### Secondary
```
┌─────────────────────────┐
│ ░░░ Adicionar           │  White bg, teal border
│ ▓▓▓ :hover (teal light) │
└─────────────────────────┘
```
- **Background**: White
- **Border**: 1px teal
- **Text**: Teal

#### Tertiary (Ghost)
```
┌─────────────────────────┐
│   Cancelar              │  Transparent
│ ▓▓▓ :hover (light bg)   │
└─────────────────────────┘
```

#### Danger (Delete)
```
┌─────────────────────────┐
│ ███ Deletar             │  Red background
│ ░░░ :hover (darker)     │
└─────────────────────────┘
```

---

### Card

```
┌─────────────────────────────────┐
│ Título do Card                  │  bg: white
│ ✨ Subtle shadow                │  shadow: md
│ ─────────────────────────────── │  border: light gray
│ Conteúdo aqui                   │
│                                 │
│ Rodapé opcional                 │
└─────────────────────────────────┘
```

- **Background**: White (#FFFFFF)
- **Border**: 1px solid #D7DEEA
- **Padding**: 1.5rem
- **Radius**: 12px
- **Shadow**: var(--shadow-md)

---

### Input / Form Field

```
┌──────────────────────┐
│ Label do Campo       │
├──────────────────────┤  
│ Valor aqui...        │  border: 1px #D7DEEA
│                      │  padding: 0.75rem 1rem
└──────────────────────┘  
  ✓ :focus → ring teal
```

- **Focus State**: Teal border + light teal ring
- **Disabled**: Gray background, 60% opacity

---

### Badge / Status

```
● Success    ● Warning    ● Danger     ● Info       ● Default
█████░░░░░  █████░░░░░  █████░░░░░  █████░░░░░  █████░░░░░
```

| Variant | Background | Text Color | Uso |
|---------|-----------|-----------|-----|
| **success** | #1F8A52 | White | Positivo |
| **warning** | #D97706 | White | Atenção |
| **danger** | #DC2626 | White | Erro |
| **info** | #0369A1 | White | Info |
| **default** | #1F2937 | White | Neutral |

---

### Table Header

```
┌─────────┬─────────┬─────────────┐
│ Nome ▼  │ CPF ▼   │ Ação ▼      │  Light teal bg
├─────────┼─────────┼─────────────┤  Header font: 600
│ João    │ 111.... │ [Edit]      │
│ Maria   │ 222.... │ [Delete]    │  Row borders light
├─────────┼─────────┼─────────────┤
│ Pedro   │ 333.... │ [Edit]      │  :hover → light gray
└─────────┴─────────┴─────────────┘
```

- **Header Background**: #F3F5F9 (light)
- **Header Text**: #667085 (gray) — 600 weight
- **Hover State**: Subtle gray background

---

## 📐 Espaçamento

Base: **8px**

```
xs   4px    (small gaps between components)
sm   8px    (button/input padding)
md   12px   (form field internal spacing)
lg   16px   ← DEFAULT (padding, margins, gaps)
xl   24px   (section gaps)
2xl  32px   (large spacings)
3xl  48px   (page sections)
4xl  64px   (major layouts)
```

---

## 🌑 Shadows

```
xs   0 1px 2px rgba(0,0,0,0.05)          Subtle
sm   0 2px 4px rgba(0,0,0,0.08)          Slight
md   0 8px 24px rgba(0,0,0,0.08)         Cards (default)
lg   0 16px 48px rgba(0,0,0,0.1)         Modals, floating
xl   0 24px 64px rgba(0,0,0,0.12)        Popovers
```

---

## 🎯 Border Radius

```
sm   8px    (inputs, badges, small elements)
md   12px   (cards, containers)
lg   16px   (modals, major containers)
xl   20px   (special elements)
full 9999px (circles, avatars)
```

---

## ⚡ Transições

```
fast      150ms ease  Micro-interactions (opacity, color)
base (std) 180ms ease Buttons, form fields, color changes
slow      250ms ease  Page transitions
v-slow    350ms ease  Modal entrades, larger animations
```

**Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (standard)

---

## 📱 Responsive Breakpoints

```
Mobile       <640px    (default styles)
Tablet       640-900px (single column → grid)
Desktop      900px+    (full layout)
Large        1200px+   (max-width containers)
```

**Approach**: Mobile-first (build for small, enhance for large)

---

## ✅ Checklist: Como Usar Este Sistema

- [ ] 1. Sempre usar `var(--color-*)` em vez de hardcoded colors
- [ ] 2. Usar `var(--space-lg)` para padding/margins padrão (1rem)
- [ ] 3. Usar `var(--shadow-md)` para cards, `var(--shadow-lg)` para modals
- [ ] 4. Heading = Sora, Body = Manrope
- [ ] 5. Border radius padrão = `var(--radius-md)` (12px)
- [ ] 6. Sempre testar focus states (keyboard navigation)
- [ ] 7. Validar contrast ratio (4.5:1 mínimo)
- [ ] 8. Mobile-first: escreva CSS mobile, depois media queries
- [ ] 9. Transições: `transition: all var(--transition-base);`
- [ ] 10. Responsivo: teste em 3 breakpoints (480px, 900px, 1200px)

---

## 🚀 Próximos Passos (Fase 4-5)

1. **Storybook** — Documentar componentes interativos (opcional)
2. **Dark Mode** — Variáveis já preparadas em `design-tokens.css`
3. **Accessibility Audit** — Validate WCAG AAA se possível
4. **Figma Sync** — Exportar tokens para Figma (se usar design tool)
5. **Performance** — Otimizar CSS (minify, purifycss)

---

**Versão**: 1.0  
**Data**: Abril 2026  
**Status**: Production-Ready  
**Manutenção**: Frontend Team  

Para mais detalhes, veja [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) (documentação completa).
