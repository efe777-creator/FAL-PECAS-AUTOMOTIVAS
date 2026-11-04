# VAL — M5 CRON-EXPIRY (`pg_cron`)

**Data:** 2026-11-04  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Migrations:** `20261104190000_pg_cron_expire_unpaid_orders.sql` · `20261104191000_payments_status_check_align_expiry.sql`

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Extensão `pg_cron` habilitada | **PASS** |
| 2 | Job `fal-expire-unpaid-orders` · `15 * * * *` · ativo | **PASS** (jobid 1) |
| 3 | Comando: `select public.expire_unpaid_orders(50, 48)` | **PASS** |
| 4 | `payments_status_check` inclui `expired` (alinhado F9A) | **PASS** (era só pending/approved/failed/cancelled) |
| 5 | 1ª limpeza manual | **PASS** — **9** pedidos expirados |
| 6 | Pós-limpeza | `aguardando_pagamento` = **6** · `cancelado` = **9** · `pronto_para_envio` = **1** |

## IDs expirados (1ª corrida)

`192d8f05…`, `816acd99…`, `9b238ea3…`, `bc92643f…`, `d8344f84…`, `aaa9a8a6…`, `653efce8…`, `85f13488…`, `0c61e65c…`

## Veredicto

**PASS** — cron agendado + limpeza inicial + constraint corrigida.

## Follow-up

- Próximas execuções automáticas a cada hora (:15).  
- Não confundir com expiração de QR Pix (independente).
