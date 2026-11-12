# VAL — Pagamento cartão (Brick + Edge) — 2026-11-12

**Runtime:** local `localhost:5173` · Supabase `wtbpwuiayednvlhvuhbh` · Netlify eFe (mesma Public Key)

## Resultado

| Checagem | Status | Evidência |
| --- | --- | --- |
| `VITE_MP_PUBLIC_KEY` formato Public Key prod (`APP_USR-{uuid}` len 44) | PASS | Netlify + `.env.local`; **não** autentica em `/users/me` (não é Access Token) |
| `place_order` canal `credit_card` | PASS | Pedido `1617dd70-…` · payment stub `cdd1cef9-…` · R$ 50,05 · channel `card` |
| Card Payment Brick carrega | PASS | Campos PCI + iframes `secure-fields.mercadopago.com` · botão **Pagar** |
| Edge `create-mp-payment` com token cartão | PASS | Probe autenticado → MP `Invalid card_token_id` (502 mapeado) — prova auth, ownership, body cartão e `MP_ACCESS_TOKEN` |
| Cobrança **approved** com cartão real | BLOQUEIO homolog | Produção exige cartão real no Brick (PCI iframe); cartões de teste MP só com credenciais TEST |

## Fluxo validado

1. Buy now → frete SEDEX → **Cartão** → termos → `place_order(credit_card)`.
2. UI: `MercadoPagoCardBrickPanel` + `initMercadoPago(Public Key)`.
3. Submit Brick → `createFalPayment` → Edge `create-mp-payment` (token + `paymentMethodId` + installments; amount só do servidor).

## Código / hardening

- `classifyMpPublicKey` / `isUsableMpPublicKey`: aceita `APP_USR-{uuid}` (PK prod); rejeita Access Token longo no front.
- Checkout + resume usam só chave utilizável no Brick.

## Próximo (opcional)

- Smoke **approved** com cartão real (valor baixo) **ou** ambiente TEST (Public Key `TEST-…` + `MP_ACCESS_TOKEN` teste alinhados) e cartão `5031 7557 3453 0604` / titular `APRO`.
