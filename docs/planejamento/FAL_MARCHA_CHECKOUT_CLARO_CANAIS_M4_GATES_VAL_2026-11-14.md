# MARCHA 4 — Gates automatizados — checkout claro + canais — 2026-11-14

**Auth:** eFe / agente · **Escopo:** testes + typecheck + gate PCI · **STOP:** sem deploy

## Resultado

| Gate | Status | Evidência |
| --- | --- | --- |
| `checkoutPaymentChannel.test.ts` | PASS | 4 testes (normalize / default / resolveSelectable / preferredPaymentType) |
| `checkoutSession.test.ts` | PASS | 4 testes (incl. round-trip credit_card/debit_card + legado `card`) |
| `checkoutMoments.test.ts` | PASS | 6 testes (incl. paymentAwaiting + avanço bloqueado) |
| `tsc --noEmit` | PASS | exit 0 |
| `pnpm lint` (oxlint) | PASS herdado | só warnings pré-existentes (router / set-state-in-effect); sem erro novo nos arquivos desta MARCHA |
| Diff `MpCardSecureFields.tsx` | PASS | mtime 2026-11-13 · SHA256 `180230EB…996FDB99` — **sem alteração nesta MARCHA** |
| Sem `key={channel}` em `MercadoPagoCardBrickPanel` | PASS | code review CheckoutPage + ResumeOrderPaymentPanel |

## Entrega funcional coberta (M1–M3)

- `selectPayChannel` único (Pix/crédito/débito) sem stale no retry
- Seletor compacto no step 4 (`mpAwaiting`) + `preferredPaymentTypeFromChannel`
- `ResumeOrderPaymentPanel` com Pix / Crédito / Débito
- Momentos UI: Dados e endereço → Entrega → Pagamento
- CTAs mid-pay consolidados; NF explícita na retirada

## Próximo

- **MARCHA 5** — matriz humana desktop/Android/iPhone (obrigatória antes do release)
- **MARCHA 6** — publish só com autorização explícita do eFe

**Assinatura:** MARCHA 4 gates · 2026-11-14 · PASS automatizado.
