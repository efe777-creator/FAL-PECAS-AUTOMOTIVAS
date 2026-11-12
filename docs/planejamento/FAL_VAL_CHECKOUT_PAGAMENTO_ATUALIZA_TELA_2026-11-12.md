# VAL — Checkout atualiza tela pós-pagamento · 2026-11-12

## Implementação

- `isCheckoutPaymentSettled` + testes
- `useCheckoutOrderPaymentWatch` em `CheckoutPage` enquanto `mpAwaiting`
- Poll + visibility/focus; sync MP best-effort; `listOwnPaymentStatusesByOrder` (não só pickActive pending)

## Aceite (smoke manual)

| Caso | Esperado |
|------|----------|
| Pix → Pagar com cartão → approved | `/pedido/{id}/confirmacao` sem F5 |
| Pix → Ver entrega → approved | redirect sozinho |
| Sem mpAwaiting | sem poll |

Vitest: `isCheckoutPaymentSettled.test.ts`
