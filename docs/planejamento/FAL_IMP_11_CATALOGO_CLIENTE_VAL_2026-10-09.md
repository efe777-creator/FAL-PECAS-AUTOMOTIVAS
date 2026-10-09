# FAL-IMP-11 / VAL-11 — Catálogo cliente

**Data:** 2026-10-09  
**Gate:** Onda 2 (pós-Onda 1)  
**Diagnóstico:** [FAL_IMP_11_CATALOGO_DIAGNOSTICO_2026-10-09.md](./FAL_IMP_11_CATALOGO_DIAGNOSTICO_2026-10-09.md)  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## 1. Auditado

| Item | Achado |
|------|--------|
| FIND-007 “lista vazia” | **Não** em wtbp — RPC 100; UI 24 cards |
| Residual | Filtros veículo + quick-pick empurravam grade: `inViewAtTop=0` |
| Contrato | `search_products` = `published`; compra = `is_available` |

---

## 2. Alterado (plano A–D aprovado via MARCHA)

| # | Entrega | Onde |
|---|---------|------|
| A | Filtros veículo + veículos salvos em `<details>` (fechado por padrão; abre se ativos) | `CatalogPage.tsx` |
| A | Sticky “N produtos” + grade sobe no 1º viewport | idem |
| B | Empty com lista dos filtros ativos + chips “Remover” | idem |
| C | Copy PRD + comentário `searchCatalog` + subtítulo UI | PRD §9 · `searchService.ts` · UI |
| D | FIND-007 reclassificado/fechado quantitativo | FINDINGS |

**Não alterado:** schema RPC; sort SQL (FIND-012); `commercial_ref` no RPC (opcional F adiado); F11 imagens; MP; repair.

---

## 3. VAL-11

| Teste | Resultado |
|-------|-----------|
| SQL wtbp published / RPC total_count | **100** (diagnóstico) |
| Browser `/catalogo` `scrollY=0` | **`inViewAtTop = 3`** (antes 0) — **fato** pós-fix |
| Contagem UI | “100 produtos · mostrando 24” |
| Filtros veículo | `details.open = false` sem query veículo |
| Lint CatalogPage / searchService | sem erros novos |

---

## 4. Status

| | |
|--|--|
| FAL-IMP-11 | **Concluído** (escopo A–D) |
| FAL-VAL-11 | **PASS** (critérios §7 do diagnóstico para A–D) |
| FIND-007 | **fechado** (quantitativo); residual UX tratado |
| Próximo sugerido | IMP-12 · ou paralelo smoke MP / FIND-006 carrinho |

---

## 5. Critérios de aceite (checklist)

- [x] Diagnóstico wtbp anexado  
- [x] FIND-007 atualizado  
- [x] total UI alinhado a `search_products`  
- [x] 1º viewport mostra resultado (ou empty/error), não só filtros  
- [x] Regra published vs available documentada  
- [x] Sem schema destrutivo  
