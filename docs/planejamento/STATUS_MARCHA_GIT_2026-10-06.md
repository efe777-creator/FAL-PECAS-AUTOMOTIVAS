# Status marcha Git — F9-C Pix + webhook 2026-10-06

## Tips

| Branch | Tip |
|--------|-----|
| `feat/f9-c-mp-pix-webhook` | _(este pacote)_ |
| `main` | `d851617` (pré-merge) |
| `dev` | `3eaf0ef` (pré-merge) |
| `plan` | sync docs pós-merge |

## Feito (F9-C)

- Edge `mercado-pago-webhook` + core HMAC
- RPC `confirm_mercadopago_payment` (aplicada no linked)
- Checkout Pix (`VITE_PAYMENT_PROVIDER=mercadopago`)
- Vitest payments **37 PASS** + build PASS

## STOP

Sem F9-D (cartões/Brick) · sem produção · sem commit de secrets.

**Próximo:** `MARCHA F9-D`.

## Humano

Secrets + deploy Edges + configurar webhook URL no DevPanel MP (app FALPecasSandbox).
