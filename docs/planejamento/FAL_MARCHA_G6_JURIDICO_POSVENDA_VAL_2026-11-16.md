# MARCHA G6 — Jurídico / pós-venda / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §9  
**Classe:** MVP-bloqueador  
**Runtime:** `wtbpwuiayednvlhvuhbh` · draft + localhost tip `75d7a83`

---

## Resultado geral: **FAIL** (STOP em 6.5)

| Passo | Status | Evidência |
|-------|--------|-----------|
| 6.1 Termos/privacidade/trocas | **PASS** | `/termos` `/privacidade` `/trocas-devolucoes` · versão `2026-11-09` · footer + checkout links |
| 6.2 Cancel unpaid + request cancel + confirm receipt + report issue | **PASS** | RPCs no remoto + UI `AccountOrderDetailPage`; cancel unpaid path G3 (`customer_cancel_unpaid_order`) |
| 6.3 RLS pedido alheio | **PASS** | Policy `orders_select_own`: `customer_id = current_customer_id() OR is_staff()`; insert direto revogado |
| 6.4 Backup antes limpeza 001 | **PASS*** | Sem limpeza 001 nesta marcha; regra STOP preservada (só pós-G7 + backup + OK eFe) |
| 6.5 Canal atendimento humano | **FAIL** | Netlify **sem** `VITE_WHATSAPP_PHONE` / `VITE_STORE_PHONE` / `VITE_STORE_EMAIL` · rodapé draft/local **sem** WhatsApp/tel/e-mail |

**Gate G6:** **FAIL** — falta contato humano visível no front (env Netlify).

---

## 6.1 Detalhe

| Rota | Título | Versão |
|------|--------|--------|
| `/termos` | Termos de uso | 2026-11-09 |
| `/privacidade` | Política de privacidade | 2026-11-09 |
| `/trocas-devolucoes` | Trocas e devoluções | 2026-11-09 |

Smoke: localhost + draft (conteúdo via DOM). Textos resumidos operacionais — D-G6-LEGAL (jurídico completo) permanece decisão humana.

---

## 6.2 Paths

| Ação | RPC | UI |
|------|-----|----|
| Cancel unpaid | `customer_cancel_unpaid_order` | Cancelar pedido (aguardando pagamento) |
| Request cancel | `request_order_cancellation` | Cancelar o pedido (pago) |
| Confirm receipt | `customer_confirm_receipt` | Confirmar recebimento |
| Report issue | `customer_report_delivery_issue` | Reportar problema |

---

## 6.5 Bloqueio (ação eFe)

Definir no Netlify (site `fal-pecas-automotivas`) e redeploy draft/prod:

```text
VITE_WHATSAPP_PHONE=55XXXXXXXXXXX
VITE_STORE_PHONE=…          # opcional se = WA
VITE_STORE_EMAIL=…@…
VITE_STORE_CNPJ=…           # opcional rodapé
VITE_STORE_CITY_STATE=…
```

Sem inventar número. Após set + rebuild: revalidar rodapé com link `wa.me` → reabrir gate G6.

---

## Próximo

**STOP G6** até contato env. Depois G7 E2E.  
Dívidas herdadas: `--prod` Netlify · Pix>201 · ME purchase live.
