# VAL — MARCHA HOME-04 · Smoke gate promocional (resolve)

**Data:** 12/11/2026  
**Auth:** eFe — `MARCHA`  
**SKU:** TDI1006 (`50269e74-7ef8-4393-9f63-2e55741d9b04`)  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Spec:** [FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md](./FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md)

---

## Achado operacional pré-smoke

| Item | Valor remoto |
|------|----------------|
| Lista Promocional | `status = inactive` (antes do smoke) |
| Itens na lista promo | 0 |

Por isso o seed HOME-03 gerou 0 ativações. **Para operar promoções, a Lista Promocional precisa estar `active`.**

---

## Cenários

| # | Cenário | Esperado | Obtido | Resultado |
|---|---------|----------|--------|-----------|
| 1 | Lista active + item R$ 40 + `product_promotions` active | resolve → promocional 40.00 | `40.00` / `promocional` | **PASS** |
| 2 | Mesmo item na lista, promoção **desativada** | resolve → Base (lista ≠ ativa) | `47.25` / `preco-base` com `still_on_promo_list=1` | **PASS** |
| 3 | Cleanup: remove item smoke + lista `inactive` de novo | Base; lista inactive | lista `inactive`; resolve Base | **PASS** |

---

## Conclusão HOME-04 (núcleo resolve)

**Gate Opção A comprovado em produção:**  
`price_list_items` na promocional **sem** ativação **não** altera o preço da loja.

Integração UI card→PDP→cart→pedido com massa real: **pendente eFe** (ativar Lista Promocional + cadastrar campanha via admin).

---

## Limpeza

- Item smoke TDI1006 removido da Lista Promocional.  
- Lista Promocional restaurada para `inactive` (estado pré-smoke).  
- Eventos `activate`/`deactivate` com `meta.smoke=home04` preservados no histórico.

**Assinatura:** MARCHA HOME-04 gate smoke PASS · 2026-11-12.
