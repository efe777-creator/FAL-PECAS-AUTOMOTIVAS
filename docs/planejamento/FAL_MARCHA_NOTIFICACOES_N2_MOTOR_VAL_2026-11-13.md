# VAL — CP-NOT N2 Motor de Notificações

**Data:** 2026-11-13  
**Auth:** eFe · MARCHA N2  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Migration:** `20261113190000_cp_not_n2_notification_engine.sql` (applied + repair history)  
**Plano:** [FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md](./FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md)

---

## Entregue

| Item | Evidência |
|------|-----------|
| Catálogo `notification_kind_catalog` | 29 kinds · severity · mandatory · staff copy |
| `notification_deliveries` | Unique (evento × recipiente × canal) |
| Inbox `severity` / `actionable` | Colunas em `app_notifications` |
| Fanout via catálogo | Staff gaps: pagamento, novo pedido, análise, separação |
| Idempotência | ON CONFLICT inbox + deliveries |
| Reprocess | `reprocess_notification_delivery` (failed/skipped · in_app · staff) |
| Mark-read → delivery `read` | RPCs atualizadas |
| FE | Service lê severity/actionable; UI usa `notificationNeedsAction` |
| Testes | `appNotificationCopy.test.ts` PASS |

## Critérios

| ID | Situação N2 |
|----|-------------|
| NOT-01 | Melhorado — catálogo + staff fanout |
| NOT-02 | Parcial — staff ainda broadcast por role |
| NOT-03 | OK in_app (+ deliveries) |
| NOT-09 | Parcial — delivery log + reprocess; WA/mail N3/N4 |
| NOT-10 | Melhorado — deliveries por canal |

## Smoke humano (aberto)

- [ ] Aprovar pagamento → cliente + **ops** recebem inbox
- [ ] Pedido em análise / enviado à separação → ops notificado
- [ ] Decisão cliente → ops `acao_necessaria`
- [ ] Linha em `notification_deliveries` status `sent` por evento
- [ ] Marcar lida → delivery `read`

## Fora N2

WhatsApp (N3), e-mail (N4), UI admin de policies (N5), prazo expirando / falha logística (sem `order_event` ainda).
