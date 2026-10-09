# FAL-IMP-11 / VAL — Card visual (M1–M6)

**Data:** 2026-10-09  
**Escopo:** plano mínimo §21 do diagnóstico visual/import — **somente card** + doc PDP  
**Runtime:** wtbp  
**PDP layout:** congelado (contrato em `FAL_CONTRATO_PDP_v0.1_2026-10-09.md`)

---

## 1. Entregas

| # | Entrega | Status |
|---|---------|--------|
| M1 | `Referência:` no card | Feito — `formatReferenciaFromProduct` |
| M2 | CTA **Ver produto** → `/produto/:id` | Feito — sem Adicionar no card |
| M3 | Apps agrupadas por montadora (PVC) | Feito — `compatibilityGroups` + UI |
| M4 | Title case na exibição | Feito — `toCommercialTitleCase` |
| M5 | “A partir de” condicional | Feito — `listPrice > resolved + ε` |
| M6 | Contrato PDP v0.1 | Feito — doc; **sem** redesign PDP |

---

## 2. Arquivos

| Arquivo | Mudança |
|---------|---------|
| `lib/productLabels.ts` | `REFERENCIA_*`, `VER_PRODUTO_*`, `formatStorePriceLabel`, seção Aplicação |
| `lib/entityNormalize.ts` | `toCommercialTitleCase` (exibição) |
| `services/products/compatibilitySummary.ts` | `groupCompatibilityApps` / `loadCompatibilityGroups` |
| `components/product/ProductCard.tsx` | Layout card M1–M5 |
| `types/index.ts` | `CompatibilityAppLine` / `CompatibilityAppGroup` |
| `docs/.../FAL_CONTRATO_PDP_v0.1_*.md` | Contrato domínio PDP |
| `*.test.ts` | Labels, groups, title case |

---

## 3. Não alterado

| Item | Motivo |
|------|--------|
| Layout `ProductPage` | Gate M6 — só doc |
| Schema / migrations | Fora do plano mínimo |
| Import massa apps/imagens | FIND-004 residual |
| Match key entidades | Title case só na UI |

---

## 4. VAL

| Teste | Resultado |
|-------|-----------|
| Vitest `productLabels` / `compatibilitySummary` / `entityNormalize` title case | **10 passed** |
| Lint card / labels / summary | sem erros novos |
| Aceite manual wtbp: Referência + Ver produto + apps PVC + preço | pendente eFe |

---

## 5. Status

| | |
|--|--|
| FAL-IMP-11 card M1–M5 | **Implementado** |
| FAL-IMP-11 M6 doc PDP | **Proposto** (aguardando aceite para código PDP) |
| FAL-VAL-11 card | **PASS** (Vitest); smoke wtbp pendente eFe |
