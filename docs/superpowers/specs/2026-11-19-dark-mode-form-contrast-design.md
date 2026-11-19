# Spec — Contraste dark mode em formulários e textos

**Data:** 2026-11-19 · **Branch:** `dev`  
**Status:** Em implementação (varredura)

## Regra (telas atuais e futuras)

| Uso | Classe |
|-----|--------|
| Corpo / títulos | `text-fal-fg` |
| Labels / hints / placeholder | `text-fal-muted` |
| Input / select / textarea | `fal-field` ou `Input`/`Select` (`bg-fal-surface text-fal-fg`) |
| Card / form / modal | `bg-fal-surface` |
| Callout / painel destaque | `bg-fal-surface-2 border-fal-line` |
| Header / nav em dark | `text-fal-navy dark:text-fal-fg` |
| Badge amarelo | `bg-fal-yellow/35`+ `text-fal-navy-dark` (ou `bg-fal-yellow`) |
| CTA amarelo | `bg-fal-yellow text-fal-navy-dark` |

## Proibido

- `bg-white` em campos/painéis (ilha + `fal-fg` claro = ilegível no dark)
- Hex light (`#f4f7fb`, `#fafbfc`, …) com tokens dark
- `text-fal-navy` / `text-fal-navy-dark` como texto de corpo em superfície escura

## Primitivos

- `fal-pecas/src/components/common/Input.tsx`
- `fal-pecas/src/components/common/Select.tsx`
- Util `.fal-field` em `fal-pecas/src/styles/index.css`
