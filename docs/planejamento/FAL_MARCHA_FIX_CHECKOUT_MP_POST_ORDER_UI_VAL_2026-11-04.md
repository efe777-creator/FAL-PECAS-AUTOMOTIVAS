# VAL — MARCHA_FIX_CHECKOUT_MP_POST_ORDER_UI

**Data:** 2026-11-04  
**Finding:** FIND-SMOKE-UI-001 ([MP smoke S2](./FAL_MARCHA_SMOKE_MP_S2_VAL_2026-11-04.md))  
**Auth:** MARCHA (próximo passo pós-smoke)

---

## Causa (FATO)

Em `CheckoutPage`, após `place_order` MP o código chamava `clear()` e depois `setMpAwaiting(...)`.  
O early-return `if (!items.length)` renderizava **Carrinho vazio** e **nunca** montava `MercadoPagoPixPanel` / `MercadoPagoCardBrickPanel`.

---

## Correção

| Arquivo | Mudança |
|---------|---------|
| `fal-pecas/src/pages/Checkout/checkoutEmptyGuard.ts` | Helper: empty só se `itemCount===0 && !hasMpAwaiting` |
| `fal-pecas/src/pages/Checkout/checkoutEmptyGuard.test.ts` | 3 testes — **PASS** vitest |
| `fal-pecas/src/pages/Checkout/CheckoutPage.tsx` | Usa guard; `setMpAwaiting` **antes** de `clear()`; aside com total do pedido em awaiting |

---

## Aceite desta MARCHA

- Unit guard verde  
- Código: Pix/Brick permanecem renderizáveis com carrinho limpo  

**Reteste prod (04/11 pós PR #43 merge → `index-CV1mwNAe.js`):**  
- Pix: **PASS UI** — «Pix — aguardando confirmação» + Copiar código Pix + status pending · pedido `0df5901c…` · total R$ 128,12 · **sem** Carrinho vazio.  
- Cartão Brick / webhook approve: **ainda pendente** nesta reexecução.

---

## STOP

FIND-SMOKE-UI-001 **corrigido em prod** (evidência Pix).  
**Próximo:** reteste Brick cartão + approve webhook; S1 D-FRETE B; depois S4.

**Assinatura agente:** VAL FIX CHECKOUT MP POST ORDER UI 2026-11-04.
