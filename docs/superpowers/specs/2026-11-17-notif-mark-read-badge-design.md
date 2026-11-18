# Spec — CP-NOT P0: marcar lida atualiza badge do sino

**Data:** 2026-11-17 · **Auth:** eFe · **Branch:** `dev`  
**Status:** Aprovado (MARCHA “faça”)

## Problema

1. Ao marcar lida (1 ou todas), o **número do sininho** não cai na hora (2 instâncias no header; sync só Realtime/poll).
2. Selo **Atenção/Nova** pode permanecer após `read_at`, parecendo “ainda não lida”.

## Comportamento

| Ação | UI imediata | Servidor |
|------|-------------|---------|
| Marcar 1 lida | badge −1 (mín. 0); item com `readAt` local | `mark_app_notification_read`; rollback se falhar |
| Marcar todas | badge **0**; items com `readAt` | `mark_all_app_notifications_read(p_audience)`; rollback se falhar |
| Qualquer mark | dispara `fal:notif-changed` `{ audience, unread? }` | Sinos escutam; `unread` = otimista; sem `unread` = refresh |

## Selos (lida)

- `readAt` setado → sem Nova/Atenção (Informativa omitida na UI)
- Filtro “Ação” = precisa ação **e** não lida

## Fora de escopo

Paginação histórica, detalhe da mensagem, WhatsApp/e-mail, N5 templates.
