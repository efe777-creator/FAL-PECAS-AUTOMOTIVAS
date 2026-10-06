# Status marcha Git — F9-C Pix + webhook 2026-10-06

## Tips

| Branch | Tip |
|--------|-----|
| `plan` | _(este commit)_ |
| `dev` | `95d7bb0` |
| `main` | `1aef9b6` (PR #8) |

## Feito (F9-C)

- Edge `mercado-pago-webhook` + core HMAC
- RPC `confirm_mercadopago_payment` (aplicada no linked)
- Checkout Pix (`VITE_PAYMENT_PROVIDER=mercadopago`)
- Vitest payments **37 PASS** + build PASS
- PR #8 MERGED

## STOP

Sem F9-D (cartões/Brick) · sem produção · sem commit de secrets.

**Próximo:** `MARCHA F9-D`.

## Humano

Secrets + deploy Edges + configurar webhook URL no DevPanel MP (app FALPecasSandbox).
