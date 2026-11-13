# VAL — Inventário gaps cotação carrinho (medidas / POL / caixas)

**Data:** 2026-11-13  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Spec:** [FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md](./FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md)  
**Auth:** eFe — Opção 1 consolidação assertiva  

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Published com peso + L/A/P > 0 (ME quote-ready) | **PASS** — 100/100 |
| 2 | Published com `pol_unit` not null | **PASS** — 100/100 |
| 3 | `own_delivery_allowed` + POL null | **PASS** — 0 |
| 4 | Caixas ativas P/M/G | **PASS** — 3 ativas (P 20×15×10 / M 40×30×20 / G 60×40×40) |
| 5 | Veículos FAL + tarifas | **PASS** — moto capacity 12 + carro 48; tarifas ativas |
| 6 | Classificações com `default_*` preenchido | **PASS** pós-calibração — 12/38 (todas com published) · [VAL calibração](./FAL_VAL_COTACAO_CARRINHO_CALIBRACAO_2026-11-13.md) |
| 7 | Filtro gap POL na listagem admin | **PASS** — opção “Sem capacidade de entrega (frete FAL)” |

---

## Evidência (query remota)

```
published=100
published_quote_ready_me=100
published_measure_gap=0
published_pol_null=0
own_allowed_pol_null=0
published_own_allowed=100
```

Caixas: Caixa P / M / G `active=true`.  
Own: motorcycle `capacity_pol=12`, car `48`; tarifas mín 15/25.

---

## Conclusão inventário

- Cotação ME/FAL no carrinho **já tem dados de produto** suficientes no published atual.
- Assertividade futura (SKU novo) depende de **defaults de categoria** + apply + filtro POL — foco da calibração/patches.
- Packing v1 + 3 caixas adequadas ao mix observado (peças pequenas; Caixa P/M cobrem a maioria).

## STOP

Não altera algoritmo de packing. Calibração = defaults categoria a partir das médias dos published + patches admin.
