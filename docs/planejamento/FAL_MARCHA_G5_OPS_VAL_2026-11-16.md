# MARCHA G5 — Operação / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §8  
**Classe:** MVP-bloqueador  
**Pedido smoke ops:** `dcb929db-2884-4449-81ab-2da4eac31ecc` · TDI0303 · R$ 1,00 · status atual `pronto_para_envio`  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Resultado geral: **PASS**

| Passo | Status | Evidência |
|-------|--------|-----------|
| 5.1 Pedido pago na fila análise/separação | **PASS** | Trail `payment_approved` → `order_received` → análise (`item_availability_set` / `em_analise`) · hub admin `ATTENTION_STATUSES` inclui `pagamento_aprovado`…`em_separacao`…`pronto_para_envio` |
| 5.2 Separação item + complete → pronto | **PASS** | Events: `separation_started` (confirmado→em_separacao) · `item_separated` · `separation_completed` (→`pronto_para_envio`) via RPCs `set_order_item_separated` / `complete_order_separation`; item `separated=true` |
| 5.3 Estoque/reserva vs modo loja | **PASS** | `store_settings.inventory_mode=sem_estoque`; pedidos smoke `inventory_mode_at_order=sem_estoque` (sem reserva obrigatória); `place_order` só reserva se `com_estoque` |
| 5.4 Margem/custo no detalhe | **PASS** | Admin `AdminOrderDetailPage` carrega `loadProductBaseCosts` + `summarizeOrderMargin` (Receita / CMV / Lucro / Margem %); vitest `orderMarginSummary` PASS |

**Gate G5:** **PASS** — rotina documentada no pedido `dcb929db…` até `pronto_para_envio`.

---

## 5.1 / 5.2 Trail (prod)

Pedido `dcb929db-2884-4449-81ab-2da4eac31ecc`:

| Evento | Nota |
|--------|------|
| `payment_approved` | MP `bcc5f2eb…` |
| `order_received` / `confirmation_started` | Entrada ops |
| `item_availability_set` | disponibilidade (incl. prazo) |
| `order_awaiting_decision` / cliente aceita | `confirmado` |
| `separation_started` | `confirmado` → `em_separacao` |
| `item_separated` | SKU TDI0303 |
| `separation_completed` | → **`pronto_para_envio`** |

RPCs no remoto: `transition_order_status`, `set_order_item_availability`, `set_order_item_separated`, `complete_order_separation`, `ship_order`.

---

## 5.3 Estoque

```text
store_settings.inventory_mode = sem_estoque
orders.inventory_mode_at_order (smoke) = sem_estoque
```

Modo atual **não** exige reserva negativa-protegida no place; path `com_estoque` existe no SQL (`quantity_reserved` + movements) para quando a loja ligar o modo.

---

## 5.4 Margem

```text
vitest orderMarginSummary (+ logistics queues): PASS
UI: bloco margem no detalhe admin (AJUSTE-033)
```

\*Live staff login no admin nesta sessão = não repetido; contrato código+SQL+histórico fecha gate. Dívida: smoke UI admin logado opcional.

---

## Próximo

**MARCHA G6** (jurídico/pós-venda mínimo + RLS + atendimento).  
Dívida ops herdada: `--prod` Netlify · Pix>201 live · ME purchase live.
