# VAL — MARCHA_LOGISTICA_HUB

**Data:** 2026-11-04  
**Auth:** MARCHA (pós-α · P0-HUB)  
**Plano:** [FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md)  
**D-FRETE:** **B** (inalterado)

---

## Escopo desta MARCHA

Hub admin Logística (4 atalhos) + redirect legado `/admin/frete` → origem.  
**Fora:** medidas Manual/Global (P0-MED), remetente completo (P0-ORI), frete próprio/ME live.

---

## Entrega (FATO)

| Item | Estado |
|------|--------|
| `/admin/logistica` hub 4 cards | OK |
| `/admin/logistica/origem` = `AdminShippingOriginPage` | OK |
| Placeholders frete-próprio / ME / configs | OK (“Em breve”) |
| Nav + dashboard “Logística” | OK |
| `/admin/frete` → `Navigate` origem | OK |
| Nota medidas no form produto (sem migration) | OK |
| `tsc --noEmit` | PASS |

### Arquivos

- `fal-pecas/src/pages/admin/logistics/AdminLogisticsHubPage.tsx` (novo)
- `fal-pecas/src/pages/admin/logistics/AdminLogisticsPlaceholderPage.tsx` (novo)
- `fal-pecas/src/app/router.tsx`
- `fal-pecas/src/components/admin/AdminLayout.tsx`
- `fal-pecas/src/pages/admin/AdminDashboardPage.tsx`
- `fal-pecas/src/pages/admin/shipping/AdminShippingOriginPage.tsx`
- `fal-pecas/src/pages/admin/products/AdminProductFormPage.tsx`

---

## Aceite

- Staff vê **Logística** no menu; hub com 4 atalhos  
- Origem funcional sob hub; link antigo `/admin/frete` redireciona  
- Placeholders não fingem integração live  

---

## STOP

**P0-HUB fechado.**  
**Próxima MARCHA sugerida:** `MARCHA_LOGISTICA_MEDIDAS_PRODUTOS` (origem Manual/Global por campo) **ou** `MARCHA_LOGISTICA_ORIGEM_REMETENTE` (evoluir `store_shipping_origin`).

**Assinatura agente:** VAL MARCHA_LOGISTICA_HUB 2026-11-04.
