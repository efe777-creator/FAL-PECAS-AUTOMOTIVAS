# VAL — CP-NOT N5 Admin parcial

**Data:** 2026-11-13  
**Auth:** eFe · MARCHA (pós N2; WhatsApp continua FUTURO)  
**Plano:** [FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md](./FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md)

---

## Entregue

| Item | Evidência |
|------|-----------|
| Service ops | `notificationOpsService.ts` — deliveries, canais, catálogo, reprocess |
| Admin `/admin/avisos` | Abas: Minha caixa · Histórico de envios · Canais e catálogo |
| Reprocess | Botão em `failed`/`skipped` in_app → `reprocess_notification_delivery` |
| Canais | Leitura: in_app on · whatsapp/email/push off (sem toggle perigoso) |
| Catálogo | Tabela kinds (severity, mandatory, canais) — só leitura |

## Fora N5 parcial

- Editar templates / desligar kinds mandatory
- Liga WhatsApp (N3 FUTURO)
- E-mail (N4)

## Smoke humano

- [ ] Abrir `/admin/avisos` → três abas
- [ ] Após evento de pedido → linha em Histórico (`sent`)
- [ ] Canais: whatsapp **Off**
- [ ] Reprocess só aparece em failed/skipped
