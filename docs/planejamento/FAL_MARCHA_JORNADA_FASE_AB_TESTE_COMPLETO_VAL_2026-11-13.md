# VAL — Teste completo Fase A + B (garantia)

**Data:** 2026-11-13  
**Projeto remoto:** `wtbpwuiayednvlhvuhbh`  
**Pedido:** TESTE COMPLETO, AJUSTE E GARANTIA DE FUNCIONALIDADES

## Resultado automático

| Check | Evidência | OK |
|-------|-----------|----|
| Vitest `src/lib` + audits | **255** testes / **63** arquivos | SIM |
| `tsc --noEmit` | limpo | SIM |
| RPCs A/B no remoto | `finalize`, `staff_request` (4 args), `customer_respond` (3 args), `hold`, `withdraw`, `set_item_separated`, `complete_separation`, `admin_set_own_dispatch_details`, `admin_set_shipment_tracking` | SIM |
| Overload ambíguo `customer_respond(uuid,text)` | **DROP** remoto + migration `20261113151000_drop_customer_respond_2arg.sql` | SIM |
| Gates no corpo SQL | finalize / respond / own_dispatch / separation / staff_request = true | SIM |
| Colunas | `orders.customer_decision`, `decision_proposal`; `order_items.availability`, `lead_days`, `staff_note`, `separated` | SIM |

## Ajustes feitos neste passe

1. **OwnShipPanel** — hooks (`useMemo`/`useEffect`) antes de early return (React rules).
2. **PostgREST** — removida overload 2-arg de `customer_respond_order_decision` (risco de ambiguidade).
3. **AdminOrderDetailPage** — botão “Confirmar…” desabilitado em análise incompleta / com indisponível sem autorização do cliente.
4. **Testes** — `orderPacking.format.test.ts`; copy de notificação alinhada a “decisão”.
5. **2026-11-13 (MARCHA)** — `continue_available` **não** vai para `confirmado`; notifica ops; operador finaliza (`20261113152000_customer_continue_awaits_staff.sql`).

## Smoke humano (ainda aberto)

Cenários com pedido pago real: ver VAL Fase A (#1–7) e Fase B (#1–5). Automação cobre código + assinaturas SQL; fluxo UI end-to-end com pedido de teste permanece checklist operacional.

## Garantias cobertas (código + SQL)

- Indisponível **não** finaliza sem `continue_available` / legado `authorized` (SQL + UI).
- Cliente: Continuar → `confirmado`; Esperar → `aguardando_disponibilidade`; Cancelar → motivo obrigatório + pending.
- Separação ignora `indisponivel`; só itens a enviar precisam `separated`.
- Own: `app_cost` grava G8 `effective_cost` sem alterar `shipping_amount`.
- Tracking: `tracking_url` em own/ME; cliente monta link via `buildTrackingUrl`.
