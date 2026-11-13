# VAL — Garantir configurações e correções (cotação carrinho)

**Data:** 2026-11-13  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Spec:** [FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md](./FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md)  

---

## Auditoria

| # | Item | Antes | Depois |
|---|------|-------|--------|
| 1 | Published ME-ready / POL | 100/100 | **OK** |
| 2 | Caixas P/M/G ativas | 3 | **OK** |
| 3 | ME allowlist loja | PAC, SEDEX, Jadlog .Package | **OK** |
| 4 | Origem loja | Guarulhos 07124543 completa | **OK** |
| 5 | Own `pricing_mode` | `distance_vehicle` + enabled | **OK** |
| 6 | Defaults categoria | 12 (só folhas com produtos) | **19** (rollup pais + filhos) |
| 7 | Cobertura FAL × origem | Guarulhos **fora** das faixas | **Corrigido** — faixa `07000000–07399999` |
| 8 | Apply sem default no nó | Falhava | **Corrigido** — herda pai (`resolveCategoryDefaultMeasures`) |

---

## Correções aplicadas

### Dados (wtbp)

1. Rollup de médias: **SUSPENSÃO**, **KIT AMORTECEDOR** e filhos vazios (BANDEJA, PARCIAL, S/ROLAMENTO, …).  
2. `store_own_delivery_settings.cep_ranges` passou a incluir Guarulhos (origem da loja), mantendo SP capital + zona leste 080–084.

### Código

1. `resolveCategoryDefaultMeasures` + apply usa pai se o nó estiver vazio.  
2. Copy Classificações / filtros tipados `AdminMeasureGapFilter`.

### Verificação

```
own_delivery_cep_in_coverage('07124543') = true
own_delivery_cep_in_coverage('01310100') = true
own_delivery_cep_in_coverage('80010000') = false
vitest: adminCategory + measureGap + smoke + packingParity — PASS
```

---

## STOP

Categorias sem produtos e sem ancestral calibrado (ex.: FILTROS / FREIOS vazios) continuam sem `default_*` até o agente cadastrar médias — esperado. Não altera packing v1.
