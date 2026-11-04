# VAL — MARCHA_LOGISTICA_ORIGEM_REMETENTE

**Data:** 2026-11-04  
**Auth:** MARCHA (pós-α · P0-ORI)  
**Plano:** [FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md) §3  
**Runtime:** `wtbpwuiayednvlhvuhbh` · D-FRETE **B**

---

## Escopo

Evoluir `store_shipping_origin`: nome interno, remetente, CPF/CNPJ, telefone + endereço existente; UI sob hub.  
**Fora:** multi-origem UI, Melhor Envio live, frete próprio tabela, contratação/etiqueta.

---

## Entrega (FATO)

| Item | Estado |
|------|--------|
| Colunas `internal_name`, `sender_name`, `document`, `phone`, `is_active` | OK + apply wtbp |
| Backfill `internal_name` = Origem principal | OK |
| Service validação CPF/CNPJ (11/14) + telefone (10–11) | OK |
| UI remetente + endereço; complemento opcional | OK |
| Singleton mantido (`store_shipping_origin_singleton`) | OK |
| `tsc --noEmit` | PASS |

### Arquivos

- `fal-pecas/supabase/migrations/20261104130000_store_shipping_origin_sender.sql`
- `fal-pecas/src/types/index.ts`
- `fal-pecas/src/services/admin/adminShippingOriginService.ts`
- `fal-pecas/src/pages/admin/shipping/AdminShippingOriginPage.tsx`
- `fal-pecas/src/pages/admin/logistics/AdminLogisticsHubPage.tsx` (copy)

**Nota:** nesta MARCHA também fechou o DDL pendente de P0-MED (`db query --remote` measure origins).

---

## STOP

**P0-ORI fechado.**  
**Próxima frente P2 (auth):** `MARCHA_LOGISTICA_FRETE_PROPRIO` ou deploy das fatias hub/medidas/origem.

**Assinatura agente:** VAL MARCHA_LOGISTICA_ORIGEM_REMETENTE 2026-11-04.
