# VAL — MARCHA Home Frente 1 · P0 Pagamentos + Gate Promoções

**Data:** 12/11/2026  
**Auth:** eFe — `MARCHA`  
**Spec:** [FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md](./FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md)  
**Status:** Código no working tree — **migration ainda não aplicada no remoto** (exige comando humano)

---

## Entregas

| Item | Resultado |
|------|-----------|
| PAY-P0 `falMaxInstallmentsForCheckout` / assert | PASS — `paymentDisplay.ts` + testes |
| Brick sem fallback 12x | PASS — display off → 1x |
| Create flow rejeita installments acima | PASS — `createMpPaymentFlow` + teste P0 |
| Edge `create-mp-payment` enforcement | PASS — query `store_payment_display` |
| Migration `product_promotions` + resolve + seed | PASS (arquivo) — `20261112210000_product_promotions_gate.sql` |
| Admin `/admin/home/promocoes` | PASS — listar / ativar / desativar |
| Apply migration produção | **PENDENTE** — não executado nesta MARCHA |
| Smoke 022-E1 card→pedido | **PENDENTE** — após apply |

## Testes

```text
vitest run src/lib/paymentDisplay.test.ts src/services/payments/createMpPaymentFlow.test.ts
→ 24 passed
```

## Arquivos principais

- `fal-pecas/src/lib/paymentDisplay.ts`
- `fal-pecas/src/components/payments/MercadoPagoCardBrickPanel.tsx`
- `fal-pecas/src/services/payments/createMpPaymentFlow.ts`
- `fal-pecas/supabase/functions/create-mp-payment/index.ts`
- `fal-pecas/supabase/migrations/20261112210000_product_promotions_gate.sql`
- `fal-pecas/src/services/admin/adminProductPromotionService.ts`
- `fal-pecas/src/pages/admin/home/AdminPromotionsPage.tsx`
- `fal-pecas/src/app/router.tsx`

## Próximo

1. Autorizar e aplicar migration (`db push` / pipeline FAL).  
2. Redeploy Edge `create-mp-payment`.  
3. Smoke: SKU com promo seed; desativar no admin → preço Base; reativar → promo.  
4. HOME-04 smoke jornada + Gate pós-F1 quando F1 fechar.

**Assinatura:** MARCHA Home F1 P0+gate código PASS · apply remoto pendente · 2026-11-12.
