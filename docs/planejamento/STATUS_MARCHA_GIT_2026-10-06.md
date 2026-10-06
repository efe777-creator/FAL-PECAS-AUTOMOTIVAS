# Status marcha Git — F9-B conformidade 2026-10-06

## Tips

| Branch | Tip |
|--------|-----|
| `plan` | _(este commit)_ |
| `dev` | `3eaf0ef` |
| `main` | `d851617` (PR #7) |

## Feito (F9-B + gap-close)

- [AUDITORIA_F9B…](./AUDITORIA_F9B_PRE_IMPL_2026-10-06.md)
- Edge `create-mp-payment` + body só `orderId`
- Flow testável A–I (`createMpPaymentFlow`)
- FE `createMercadoPagoPayment(orderId)` sem method
- Vitest payments **28 PASS** + build PASS
- [CHECKLIST_F9B…](./CHECKLIST_F9B_MP_CREATE_PAYMENT.md)
- [RELATORIO_FINAL…](./RELATORIO_FINAL_F9B_MP_CREATE_PAYMENT_2026-10-06.md)
- Security scan §22 PASS
- PR #6 MERGED (core `06be4e4`); PR #7 MERGED (conformidade `d851617`)

## STOP

Sem webhook · sem Pix UI · sem checkout MP · sem F7 · sem produção.

**Próximo:** `MARCHA F9-C` (Pix UX + webhook mínimo).

## Humano

Configurar `MP_ACCESS_TOKEN` TEST + `npx supabase functions deploy create-mp-payment --linked` quando for testar live.
