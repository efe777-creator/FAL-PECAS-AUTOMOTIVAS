# VAL — MARCHA Onda 2 · PDP por slug

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`

---

## Escopo

URL canônica `/produto/:slug`; UUID legado redireciona com `replace`.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Rota `produto/:slugOrId` | **PASS** |
| 2 | `getProductBySlugOrId` | **PASS** |
| 3 | Abrir por UUID → replace para slug | **PASS** |
| 4 | Card / busca / carrinho usam `productHref` | **PASS** |
| 5 | `tsc --noEmit` | **PASS** |

---

## STOP

Próximo Onda 2: RPC leve de sugestões · path completo classificação na PDP.

**Assinatura:** VAL PDP slug PASS 2026-11-05.
