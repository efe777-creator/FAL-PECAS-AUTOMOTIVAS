# VAL — MARCHA Pacote MVP-1 · Pagamentos (016/017)

**Data:** 2026-11-09  
**Auth:** eFe — `MARCHA` (fatia G3 código)  
**AJUSTE:** 016 · 017 · alinhamento 022 display  
**Plano:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Deploy:** só no **fim do dia** (Edge `create-mp-payment` precisa redeploy)

---

## Contexto

Pix + cartão Brick + webhook já existiam. Boleto/wallets **não** estão no código (correto). Gap crítico: reutilizar cobrança Pix ao trocar para cartão.

## Entregas

| Item | Resultado |
|------|-----------|
| Cancelar pending ao trocar Pix ↔ cartão (Edge) | PASS |
| Paridade no `createMpPaymentFlow` + teste H2 | PASS |
| Brick `maxInstallments` alinhado a `store_payment_display` | PASS |
| Copy: vitrine ≠ regras finais MP | PASS |
| Erros Edge em PT (`payer_document_required`, etc.) | PASS |
| Testes | PASS — 16 createMp + 3 paymentDisplay |

## Arquivos

- `fal-pecas/supabase/functions/create-mp-payment/index.ts`
- `fal-pecas/src/services/payments/createMpPaymentFlow.ts`
- `fal-pecas/src/services/payments/createMpPaymentFlow.test.ts`
- `fal-pecas/src/components/payments/MercadoPagoCardBrickPanel.tsx`
- `fal-pecas/src/services/payments/mpCreatePaymentService.ts`

## Gate humano (não fechado nesta fatia)

- `VITE_PAYMENT_PROVIDER=mercadopago` + chaves TEST/PROD
- `MP_ACCESS_TOKEN` / webhook URL / `MP_WEBHOOK_SECRET`
- Smoke Pix + cartão + webhook em ambiente real

## STOP / próximo

Redeploy da Edge `create-mp-payment` no fim do dia.  
Próxima fatia: **027/032** (legal/atendimento) ou smoke 017 com credenciais.

**Assinatura:** VAL MVP-1 pagamentos código PASS · 2026-11-09.
