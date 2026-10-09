# MARCHA PDP-C — VAL Polish P2 (specs / descrição / catálogo)

**Data:** 2026-10-09  
**Autorização:** MARCHA (eFe)  
**Runtime:** `wtbpwuiayednvlhvuhbh` · UI `http://localhost:5173`  
**Pré-condição:** [PDP-B VAL](./FAL_MARCHA_PDP_B_VAL_2026-10-09.md) · [Auditoria ML](./FAL_AUDITORIA_PDP_COMPARATIVA_ML_2026-10-09.md) P2  
**Fora de escopo:** frete, MP, reviews, relacionados, FIND-004, migrations, commit git

---

## Veredicto

| Campo | Valor |
|-------|-------|
| MARCHA PDP-C | **OK** |
| Tabela specs (polish) | **OK** (`<table>` zebra + `th`/`td`) |
| Descrição expansível | **OK** (wire; botão só se texto > 320 chars) |
| Link filtrar catálogo | **OK** (`/catalogo?maker=…` a partir da 1ª montadora) |
| Buy-box / galeria (B) | Intactos (regressão smoke) |
| Schema / PVC / FIND-004 | **Não tocados** |

---

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `fal-pecas/src/lib/productDescription.ts` | join / truncate / collapse / href maker |
| `fal-pecas/src/lib/productDescription.test.ts` | unitários PDP-C |
| `fal-pecas/src/lib/productLabels.ts` | labels Ver completa / Filtrar |
| `fal-pecas/src/lib/productLabels.test.ts` | labels PDP-C |
| `fal-pecas/src/pages/Product/ProductPage.tsx` | tabela · expand · link catálogo |

---

## Vitest (FATO)

```text
vitest.CMD run productDescription / productLabels / productSpecs / productImages / CompatibilityAppsBlock
Test Files  5 passed (5)
Tests       22 passed (22)
```

---

## Smoke browser (FATO) — BRD2109

| Check | Resultado |
|-------|-----------|
| Specs | tabela com 3 linhas · `th` presente |
| Filtrar no catálogo | href `/catalogo?maker=Hyundai` |
| Ver descrição completa | **ausente** (texto curto < limiar — correto) |
| CTA antes de apps/specs | **OK** (regressão B) |

---

## Limitações / próximo

- Relacionados com regra (categoria) → P3 / MARCHA futura  
- Frete / MP → paralelos  
- Commit/push PDP-A+B+C → gate git (`COMMIT`)

## STOP

MARCHA PDP-C **VALIDADA**. Aguardar `COMMIT` ou MARCHA P3/paralelos.
