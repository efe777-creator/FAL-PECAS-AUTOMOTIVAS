# VAL — MARCHA Pacote MVP-1 · Estoque/separação (031) + impressão (015)

**Data:** 2026-11-09  
**Auth:** eFe — `MARCHA` (fatia G5)  
**AJUSTE:** 031 · 015  
**Plano:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Deploy:** só no **fim do dia**

---

## Contexto

Núcleo de reserva/baixa/filas **já existia** (place_order, complete_order_separation, ship_order, ME). Esta fatia fecha gaps de **operação do separador**.

## Entregas

| Item | Resultado |
|------|-----------|
| `openSeparationList` A4 (SKU, qtd, ☐ conferência, sem preços) | PASS |
| Botão na fase `confirmado` / `em_separacao` | PASS — AdminOrderDetail |
| `openRomaneio` extraído para lib compartilhada | PASS — MeExpeditionPanel usa lib |
| Saldo on_hand/reserved no detalhe (modo `com_estoque`) | PASS — select + UI |
| `inventory_mode_at_order` no detalhe | PASS |

## Arquivos

- `fal-pecas/src/lib/adminOrderPrint.ts` *(novo)*
- `fal-pecas/src/components/admin/orders/MeExpeditionPanel.tsx`
- `fal-pecas/src/pages/admin/orders/AdminOrderDetailPage.tsx`
- `fal-pecas/src/services/admin/adminOrderService.ts`

## Já existia (não refeito)

- Reserva no `place_order` · baixa no `enviado` · filas separação/expedição · romaneio/etiqueta ME

## Gate humano / dado

- Loja em `com_estoque` com saldos reais em `inventory`
- Homologação ME / frete (014)
- Uso operacional das filas pelo time

## STOP / próximo

Próxima fatia sugerida: **016/017** (pagamento produção) ou **027/032** (legal/atendimento).

**Assinatura:** VAL MVP-1 estoque/separação PASS · 2026-11-09.
