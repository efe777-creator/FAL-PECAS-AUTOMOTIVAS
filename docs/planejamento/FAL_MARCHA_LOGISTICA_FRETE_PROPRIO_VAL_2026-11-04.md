# VAL — MARCHA_LOGISTICA_FRETE_PROPRIO

**Data:** 2026-11-04  
**Auth:** MARCHA (pós-α · P2-OWN antecipado na sequência do plano §5.4)  
**Plano:** [FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md)  
**Runtime:** `wtbpwuiayednvlhvuhbh` · D-FRETE **B** (inalterado — não é live)

---

## Escopo

Config admin frete próprio: ativação, faixas CEP (default SP capital `01000000–05999999`), tabela de modalidades editável; cotação mock injeta opções `own:*` quando ativo + CEP na cobertura; `resolve_mock_shipping_option` lê a mesma tabela (place_order alinhado).

**Fora / pendências do plano:** critérios avançados de precificação; multi-tabela/modalidade comercial; Melhor Envio; D-FRETE C.

---

## Entrega (FATO)

| Item | Estado |
|------|--------|
| `store_own_delivery_settings` + singleton + RLS | OK + apply wtbp |
| `own_delivery_cep_in_coverage` | OK |
| `resolve_mock_shipping_option` + branch `own:%` | OK |
| `/admin/logistica/frete-proprio` UI | OK |
| `mockShippingProvider` merge own rates | OK |
| Hub card ready | OK |
| `tsc --noEmit` | PASS |
| Default `enabled=false` | OK (opt-in) |

### Arquivos

- `fal-pecas/supabase/migrations/20261104140000_store_own_delivery_settings.sql`
- `fal-pecas/src/services/admin/adminOwnDeliveryService.ts`
- `fal-pecas/src/pages/admin/logistics/AdminOwnDeliveryPage.tsx`
- `fal-pecas/src/services/shipping/mockShippingProvider.ts`
- `fal-pecas/src/app/router.tsx`
- hub / placeholder

---

## Aceite

- Staff edita faixas + taxas; salvar com `enabled` controla presença na cotação.  
- CEP fora da faixa → sem opções `own:*`.  
- place_order com `own:fal` só válido se enabled + CEP cobertura + id na rates.  
- UI/loja permanece aviso homologação (B).

---

## STOP

**Frete próprio configurável fechado sob B.**  
**Próxima (auth):** deploy das fatias logísticas **ou** `MARCHA_LOGISTICA_MELHOR_ENVIO` (secrets + não live sem C) **ou** configs de envio.

**Assinatura agente:** VAL MARCHA_LOGISTICA_FRETE_PROPRIO 2026-11-04.
