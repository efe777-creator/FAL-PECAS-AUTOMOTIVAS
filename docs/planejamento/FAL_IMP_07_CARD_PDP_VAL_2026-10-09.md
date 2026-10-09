# FAL-IMP-07 / VAL-07 — Card / PDP

**Data:** 2026-10-09  
**Gate:** Onda 1  
**Escopo:** alinhar vitrine com identidade (IMP-03), apps (IMP-05), preço resolvido (IMP-08)

---

## 1. Auditado

| Item | Achado |
|------|--------|
| Card | Já usava `displayPrice` + código referência |
| PDP | Preço via `resolvedPrice ?? promo ?? price` (quase igual; unificar) |
| Catálogo RPC | `search_products` sem `commercial_ref` → card podia cair no sku só |
| Copy apps vazias | “Aplicações sob consulta” genérico |
| Fabricante | PDP com rótulo; card sem prefixo |

---

## 2. Alterado

| Arquivo | Mudança |
|---------|---------|
| `productLabels` | `FABRICANTE_LABEL`, `APPS_EMPTY_LABEL` |
| `searchService` | Enrich `commercial_ref` (+ sku) na página |
| `ProductCard` | Fabricante rotulado; copy apps vazias |
| `ProductPage` | `displayPrice` + `formatMoney`; mesmos rótulos |
| PRD | Fabricante na vitrine = exibir se cadastrado |

---

## 3. Não alterado

| Item | Motivo |
|------|--------|
| Relacionados (FIND-016) | F11 / regra comercial |
| Imagens reais no card | Completude F11 |
| Redesign visual | Fora do escopo Onda 1 |

---

## 4. VAL-07

| Teste | Resultado |
|-------|-----------|
| Vitest releaseChecklist (regressão IMP-10) | **6 passed** |
| Lint card/PDP/search | sem erros novos |

---

## 5. Status

| | |
|--|--|
| FAL-IMP-07 | **Concluído** |
| FAL-VAL-07 | **PASS** |
| Onda 1 blocos liberados | **Fechados** (paralelos P2 permanecem) |
