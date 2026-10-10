# MARCHA F9-F — VAL (checkout + place_order meios MP)

**Data:** 2026-10-10  
**Auth:** plano consolidado FAL 3.0 (implementação)  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Problema (FIND-015)

Com `VITE_PAYMENT_PROVIDER=mercadopago`, o checkout ainda enviava `payment_method=pix_simulated` no `place_order`, e o RPC só aceitava `*_simulated` — risco de pedido “simulado” com cobrança MP.

---

## Entregas

| Item | Evidência |
|------|-----------|
| Checkout envia `pix` / `credit_card` quando MP ativo | `CheckoutPage.tsx` |
| UI demo continua rotulada “simulado” | sem mudança enganosa |
| RPC aceita `pix`, `credit_card`, `debit_card` | migration `fase9f_place_order_mp_methods` |
| Payment MP: `provider=mercadopago`, `status=pending`, `method` real | mesmo RPC |
| Demo: `*_simulated` + `provider=simulated` | preservado |

Migration local: `fal-pecas/supabase/migrations/20261010180000_fase9f_place_order_mp_methods.sql`  
Aplicada no runtime wtbp via MCP `apply_migration`.

---

## Fora / residual

- Smoke sandbox Pix/cartão (humano H1–H6) — **não** coberto aqui  
- Produção live MP  
- Admin financeiro MP  

---

## Status

| | |
|--|--|
| F9-F código + RPC | **IMPLEMENTADO / VAL unitário de contrato** |
| Smoke comercial | **pendente humano** |
