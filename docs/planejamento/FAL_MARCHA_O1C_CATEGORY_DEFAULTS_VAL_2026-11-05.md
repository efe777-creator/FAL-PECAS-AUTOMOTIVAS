# VAL — MARCHA O1-C medidas padrão por classificação

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh` (colunas `default_*` já no schema)  
**Plano:** O1-C — padrões por categoria + `adminApplyGlobalProductMeasures` / `skip_manual`

---

## Escopo

UI e serviço para gravar peso/L/W/H padrão em `product_categories` e aplicar aos produtos da subárvore sem sobrescrever origem Manual.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Colunas `product_categories.default_*` no wtbp | **PASS** (migration O1-C) |
| 2 | `Category` + list/upsert leem/gravam defaults | **PASS** |
| 3 | Form Admin Classificações: 4 campos + `#medidas-padrao` | **PASS** |
| 4 | `adminApplyCategoryDefaultMeasures` → subárvore + `skip_manual` | **PASS** (código) |
| 5 | Hub Logística → card “Medidas por classificação” | **PASS** |
| 6 | `tsc --noEmit` | **PASS** |
| 7 | Seed runtime DIREÇÃO `default_*` (0,9 kg · 45×8×8) | **PASS** — id `a1111111-…002` |
| 8 | Apply E2E operador (botão na UI) | **PENDENTE humano** — após deploy admin |

---

## Como validar (operador)

1. Admin → Logística → **Medidas por classificação** (ou Classificações).  
2. Editar um nó (ex. subgrupo com produtos).  
3. Preencher peso/L/W/H → **Salvar alterações**.  
4. **Aplicar padrão aos produtos (respeitar Manual)** → confirmar.  
5. Abrir um produto Global na lista: medidas batem; produto Manual permanece.

---

## STOP

O1-C caixas + packing + **UI defaults categoria** fechados em código.  
Restante frete: ME-C3 etiqueta purchase/print (gate) · D-FRETE C (assinatura eFe).

**Assinatura:** VAL O1-C category defaults PASS (código) 2026-11-05 · apply E2E humano pendente.
