# Status marcha Git — F9-B 2026-10-06

## Tips

| Branch | Tip |
|--------|-----|
| `plan` | _(este commit)_ |
| `dev` | `fd697c8` |
| `main` | `06be4e4` (PR #6) |

## Feito (F9-B)

- [AUDITORIA_F9B_PRE_IMPL…](./AUDITORIA_F9B_PRE_IMPL_2026-10-06.md)
- Edge `create-mp-payment` + core idempotente
- FE `createMercadoPagoPayment` (sem checkout)
- Vitest payments **12 PASS** + build PASS
- PR #6 MERGED

## STOP

Sem deploy Edge obrigatório nesta fatia · sem webhook · sem Pix UI · sem checkout MP · sem F7.

**Próximo:** `MARCHA F9-C` (Pix UX + webhook mínimo).

## Humano

Configurar `MP_ACCESS_TOKEN` TEST + `npx supabase functions deploy create-mp-payment --linked` quando for testar live.
