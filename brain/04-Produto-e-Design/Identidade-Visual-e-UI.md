---
title: Identidade Visual e Padrões de UI da Pontus
tags:
  - pontus
  - design
  - ui
  - cores
  - tipografia
updated: 2026-11-23
summary: Guia oficial de identidade visual da marca Pontus aplicado em frontend/src/app/globals.css (verde/laranja, Plus Jakarta Sans e Inter).
---

# 🎨 Identidade Visual e Padrões de UI da Pontus

Relacionado: [[00-INDEX]] | [[01-Arquitetura/Stack-e-Ambientes]]

> **⚠️ AVISO IMPORTANTE PARA AGENTES DE IA:**
> Os arquivos `DESIGN_SYSTEM.md` e `DESIGN_SYSTEM_VISUAL.md` na raiz do repositório são de uma versão **antiga/legada** (codinome *Fidelizi*, que usava Teal `#0F766E`, Gold `#F4C542` e fontes `Sora`/`Manrope`).
> **NÃO utilize a paleta Teal/Gold.** A fonte única de verdade visual é esta nota, baseada em `Pontus_Guia_Identidade_Visual (2).md` e `frontend/src/app/globals.css`.

---

## 1. Conceito da Marca e Tom de Voz
- **Significado**: Deriva de "pontos" e também significa "mar" em latim (algo contínuo, que se renova a cada visita).
- **Símbolo**: Grade `3×3` de pontos com opacidades variadas (movimento de onda). Wordmark com `"Pont"` em tom escuro (`#0D1F16`) e `"us"` em verde primário (`#006323`).
- **Posicionamento**: *"A plataforma de fidelidade feita para quem tem restaurante, não para quem tem TI."*
- **Slogan de apoio**: *"Cada compra, um motivo para voltar."*

---

## 2. Paleta Oficial de Cores (`frontend/src/app/globals.css`)

### Light Mode (`:root` — Padrão da Aplicação)
| Token CSS | Hex | Nome / Papel na Interface |
| :--- | :--- | :--- |
| `--primary` | `#006323` | **Verde Primário**: Botões principais, links, wordmark `"us"`, foco (`--ring`). |
| `--secondary` | `#2E9B4F` | **Verde Médio**: Hover states, ícones secundários, elementos de apoio. |
| `--accent` | `#E8762C` | **Laranja Destaque**: Cor escassa, exclusiva para CTAs de conversão e notificações de recompensas/pontos ganhos. |
| `--background` | `#F4FAF6` | **Verde Claro**: Fundo geral da interface (evita branco puro chapado no fundo da página). |
| `--card` / `--sidebar` | `#FFFFFF` | **Superfície**: Cards, modais, popovers e sidebar sobre o fundo `#F4FAF6`. |
| `--foreground` | `#0D1F16` | **Verde-quase-preto**: Substitui o preto puro (`#000`) em textos e títulos. |
| `--muted` | `#E2EFE6` | Fundos secundários/sutis; texto muted: `#4B6B58`. |
| `--border` / `--input` | `#D1E3D8` | Bordas suaves harmonizadas com o tom verde. |
| `--success` | `#16A34A` | **Verde Sucesso**: Exclusivo para confirmações e metas atingidas (mais vívido que o `#006323`). |
| `--destructive` | `#DC2626` | **Vermelho Erro/Perigo**: Exclusões, falhas e alertas críticos. |

### Dark Mode (`.dark`)
- `--background`: `#0D1F16`
- `--card` / `--sidebar`: `#132B1E`
- `--primary`: `#2E9B4F`
- `--foreground`: `#F4FAF6`
- `--border`: `#1A3D2A`

---

## 3. Tipografia (`frontend/src/app/layout.tsx`)

1. **Títulos e Wordmark (`--font-heading`)**: **`Plus Jakarta Sans`**
   - Weights: `500` (Medium) e `700` (Bold).
   - Traços geométricos circulares que conversam com o conceito de pontos.
2. **Corpo e Interface (`--font-sans`)**: **`Inter`**
   - Weights: `400` (Regular) e `500` (Medium).
   - Usada em tabelas, inputs, labels, botões e textos corridos.
3. **Border Radius Padrão**: `--radius: 1rem` (`16px`).
