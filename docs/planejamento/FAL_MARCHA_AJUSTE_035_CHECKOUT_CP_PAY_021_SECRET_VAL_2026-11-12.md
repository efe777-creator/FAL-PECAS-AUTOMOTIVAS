# VAL — AJUSTE-035 | CP-PAY-021 secret + webhook live

**Data:** 2026-11-12  
**Auth:** eFe — `MARCHA` / config humana no painel MP  
**Runtime:** `wtbpwuiayednvlhvuhbh` · app live `6371863177010206` (FAL PECAS AUTOMOTIVAS)

---

## Escopo

Fechar Gate humano do secret webhook e conferir config do app **produção**.

---

## Evidências

| # | Check | Resultado | Evidência |
|---|-------|-----------|-----------|
| 1 | `MP_WEBHOOK_SECRET` no Supabase | **PASS** | CLI `updated_at` **2026-11-12T16:17:20Z** · UI Secrets dashboard (browser Cursor) lista `MP_WEBHOOK_SECRET` |
| 2 | Evento **Pagamentos** no app live | **PASS** | painel Webhooks · Modo produção · Pagamentos |
| 3 | URL de produção → Edge | **PASS** | painel live mostra URL `https://wtbpwuiayednvlhvuhbh.supabase.co…` (Edge) |
| 4 | Edge `mercado-pago-webhook` | **PASS** | dashboard Functions ACTIVE · Settings/Logs abertos no browser Cursor |
| 5 | Logs Edge recentes | **vazio** | “No results found” — esperado até 1º POST MP |
| 6 | `payment_events` | **stale** | last `2026-11-09` · 10 rows — entrega live ainda sem novo pagamento |
| 7 | Mitigação sync | **ACTIVE** | `sync-mp-payment` |

---

## Residual opcional

Próximo Pix/cartão real → confirmar: log Edge + linha nova em `payment_events`.

---

## Veredicto

| Critério | Status |
|----------|--------|
| Secret no Supabase | **PASS** |
| URL + Pagamentos no app live | **PASS** |
| Entrega webhook comprovada (ledger) | **ABERTO** (sem pagamento novo pós-config) |
| CP-PAY-021 config | **PASS** · prova delivery = smoke futuro |

**Assinatura agente:** MARCHA CP-PAY-021 via browser Cursor Supabase · 2026-11-12.
