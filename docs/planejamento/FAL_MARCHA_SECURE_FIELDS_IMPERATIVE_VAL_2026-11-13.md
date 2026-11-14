# VAL — Secure Fields imperativos (Core Methods) — 2026-11-13

## Causa

Wrappers React `@mercadopago/sdk-react` (`CardNumber` / `ExpirationDate` / `SecurityCode`):

- IDs globais fixos + `window.*Instance`
- `mount()` antes de registrar `onReady`
- CSS forçando `iframe { height: 3rem !important }` desalinhava a área digitável

## Correção

- [`MpCardSecureFields.tsx`](../../fal-pecas/src/components/payments/MpCardSecureFields.tsx): `mp.fields.create` → `on` → `mount` com IDs únicos (`useId`)
- Instância via [`mpInstance.ts`](../../fal-pecas/src/components/payments/mpInstance.ts) (mesmo singleton do `createCardToken`)
- CSS host 48px sem `!important` no iframe

## Smoke (2026-11-13)

| Cenário | Resultado |
| --- | --- |
| `/dev-mp-fields.html` | **PASS** — `READY — fields OK` |
| `/dev/mp-brick` desktop | **PASS** — 3 hosts `fal-mp-*` com iframe; “Montando…” some; Pagar/token habilitado |
| `/dev/mp-brick` mobile 390px | **PASS** — hosts h=48; iframes 1/1/1; ready OK |
| Checkout cartão | Homologação humana (digitar PAN real no browser) |

**Assinatura:** MARCHA Secure Fields imperativos · 2026-11-13.
