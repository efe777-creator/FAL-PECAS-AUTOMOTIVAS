# VAL — Calibração cotação carrinho (defaults categoria / caixas / POL)

**Data:** 2026-11-13  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Spec:** [FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md](./FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md)  
**Inventário:** [FAL_VAL_COTACAO_CARRINHO_INVENTARIO_GAPS_2026-11-13.md](./FAL_VAL_COTACAO_CARRINHO_INVENTARIO_GAPS_2026-11-13.md)  

---

## Ações

| # | Ação | Resultado |
|---|------|-----------|
| 1 | Published: peso/dims/POL | **SKIP** — já 100/100 (inventário) |
| 2 | Apply medidas em produtos | **SKIP** — sem gap; não sobrescrever manuais |
| 3 | Defaults categoria a partir da média dos published (só onde default vazio/≤0) | **PASS** — 11 classificações com produtos atualizadas |
| 4 | Caixas P/M/G | **SKIP** — já ativas e coerentes com mix |
| 5 | POL / veículos / tarifas | **SKIP** — POL presente; moto 12 / carro 48; tarifas ok |
| 6 | Nota POL unitário | Published com `pol_unit≈1` (seed provisório) — revisão comercial fina fica operação contínua |

---

## Classificações calibradas (médias)

TERMINAL DE DIREÇÃO, AXIAL DE DIREÇÃO, COMPLETO, PIVÔ, BIELETA, C/ROLAMENTO, SUPORTE DA BARRA TENSORA, BUCHA, COXIM AMORTECEDOR, PAR PARCIAL, BATENTE E LOCLIZADOR.

Cobertura pós-update: categorias **com produtos published** passam a ter `default_*` para apply em SKUs novos.  
**Rebase config:** rollup pais/filhos + faixa CEP Guarulhos — [FAL_VAL_COTACAO_CARRINHO_CONFIG_CORRECOES_2026-11-13.md](./FAL_VAL_COTACAO_CARRINHO_CONFIG_CORRECOES_2026-11-13.md) (19 classificações com defaults).

---

## STOP

Não alterou `products` nesta calibração. Não alterou packing. Próximo: smoke + filtro gap POL admin.
