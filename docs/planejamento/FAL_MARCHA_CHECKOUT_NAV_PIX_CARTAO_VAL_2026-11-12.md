# VAL — Checkout nav mid-pay + Pix→cartão + PDP frete — 2026-11-12

**Auth:** eFe  
**Runtime:** `localhost:5173`

## Entregas

| Item | Status |
| --- | --- |
| Pills 1↔2 com Pix/cartão aberto | PASS — `paymentAwaiting` permite clique; entrega read-only |
| Botão **Voltar** / Voltar à entrega / Voltar ao pagamento | PASS |
| **Pagar com cartão** (painel Pix + rodapé + sidebar) | PASS — mesmo `orderId`, limpa QR |
| Entrega view-only (radios disabled + banner) | PASS |
| PDP frete perto do Comprar + total estimado + âncora detalhes | PASS |
| `checkoutMoments` unit | PASS 5/5 |
| `tsc -b` | PASS |
| Vite `5173` | PASS (200) após restart |

## Fluxo

1. Pix gerado → pill **1** ou **Voltar à entrega** → vê endereço/frete (sem editar).  
2. Pill **2** / **Voltar ao pagamento** → QR de novo.  
3. **Pagar com cartão** → Core Methods no mesmo pedido.  

**Assinatura:** MARCHA checkout UX nav + troca meio · 2026-11-12.
