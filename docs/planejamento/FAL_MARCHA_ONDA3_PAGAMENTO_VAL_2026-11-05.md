# VAL — MARCHA Onda 3 · Condições de pagamento (11/12)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`

---

## Escopo

Infraestrutura **configurável** para texto “em até Nx…” em cards e PDP — **sem inventar política comercial**. Default `enabled=false` até o admin ligar em Home → Pagamento.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Migration `store_payment_display` no wtbp (singleton + RLS) | **PASS** (`db query --remote`) |
| 2 | Seed `enabled=false`, max 3x, parcela mín. R$20 | **PASS** |
| 3 | Lib `paymentDisplay` + testes (parcela mín. / off / copy) | **PASS** (3/3) |
| 4 | Hint em `ProductCard` + PDP | **PASS** |
| 5 | Admin Home aba Pagamento (ligar, teto, mín., superfície, prévia) | **PASS** |
| 6 | `tsc --noEmit` | **PASS** |

---

## Artefatos

- `fal-pecas/supabase/migrations/20261105210000_store_payment_display.sql`
- `fal-pecas/src/lib/paymentDisplay.ts` (+ `.test.ts`)
- `fal-pecas/src/services/store/paymentDisplayService.ts`
- `fal-pecas/src/hooks/usePaymentDisplay.ts`
- `fal-pecas/src/components/product/PaymentConditionHint.tsx`
- Wire: `ProductCard`, `ProductPage`, `AdminHomeContentPage`

---

## STOP

Onda 3 (Home comercial 06–12) **fechada em código**. Próximo gate:

- **Comercial eFe:** ligar Pagamento no admin com a política real; ou  
- **Onda 4** (import imagens / backlog); ou  
- **D-FRETE C / ME etiqueta** (gate humano).

**Assinatura:** VAL Onda 3 pagamento 11/12 PASS 2026-11-05.
