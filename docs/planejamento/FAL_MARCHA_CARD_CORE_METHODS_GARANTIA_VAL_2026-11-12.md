# VAL — Garantia plano cartão (Core Methods) — 2026-11-12

**Auth:** eFe — MARCHA  
**Runtime:** `localhost:5173` · PK `APP_USR-ae216fe5-…` · Edge app live `6371863177010206`

## Plano (objetivo)

Checkout cartão utilizável: Secure Fields montam → token → Edge `create-mp-payment` → status.

## Adequações desta onda

| Item | Antes | Depois |
| --- | --- | --- |
| UI cartão | Card Payment Brick (SF height 0) | Core Methods `CardNumber`/`ExpirationDate`/`SecurityCode` |
| Ready | contador frágil | flags por campo |
| Altura PCI | ~150px | shell `h-12` + iframe 48px |
| Issuer | só do BIN search | fallback `getIssuers` |
| DEV | chamava Edge com UUID fake | `tokenizeOnly` (prova token sem pedido) |
| Checkout/resume | mesmo componente | `tokenizeOnly` default false |

## Evidência (fresco)

| Checagem | Resultado |
| --- | --- |
| `/dev/mp-brick` SF iframes h=48, 3 containers | PASS |
| Sem “Montando campos…”; botão **Gerar token (DEV)** enabled | PASS |
| `tsc -b` | PASS (0 errors) |
| Vitest mpAdmin + createMpPaymentFlow + core + engine | PASS 36/36 |
| Cobrança **approved** E2E | PENDENTE humano (cartão real ou par TEST front+Edge) |

## Fluxo produção (inalterado no Edge)

1. Checkout momento pagamento → canal cartão → `place_order(credit_card)`.
2. `MercadoPagoCardBrickPanel` monta fields → BIN → parcelas.
3. Submit → `createCardToken` → `createFalPayment` → Edge com `MP_ACCESS_TOKEN` prod.
4. Poll/`sync-mp-payment` + webhook.

## Residuais ops (não bloqueiam montagem local)

1. Netlify: PK prod já setada; **redeploy** ainda bloqueado por crédito da conta.
2. Painel MP `6371863177010206`: domínios + tópicos webhook `payment`.
3. Smoke approved: cartão real (prod) **ou** alinhar TEST PK + `MP_ACCESS_TOKEN` TEST só em homolog.

**Assinatura:** MARCHA garantia Core Methods · formulário OK · 2026-11-12.
