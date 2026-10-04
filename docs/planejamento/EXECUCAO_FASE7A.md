# Execução — Fase 7A — Fundação do ciclo de pedidos

**Data:** 2026-10-04  
**Spec:** [ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md](./ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md)

---

## Entregue

- [x] Migration `20261004040000_fase7a_order_lifecycle.sql` (CHECK ampliado, `order_events`, helpers, `transition_order_status`, `confirm_simulated_payment` → ciclo FAL, seed, trigger `order_created`)
- [x] Aplicado no Supabase remoto (projeto `wtbpwuiayednvlhvuhbh`)
- [x] Projeção timeline cliente (`src/lib/orderLifecycle.ts`)
- [x] Serviço `transitionOrderStatus` (staff RPC)
- [x] Detalhe do pedido: timeline + eventos customer + Comprar novamente
- [x] `buyAgainService` — preço/estoque atuais, sem alterar pedido antigo
- [x] Sessão: `persistSession: true` já ativo (validado na config; critério “só Sair” documentado)

## Fora (fases seguintes)

- Dashboard `/admin/pedidos` e confirmação por item → **F7B**
- Separação / expedição / entrega UI → **F7C–E**
- Baixa de estoque operacional → **F7F**

## Gate F7A

| Critério | Status |
|----------|--------|
| Histórico/eventos consistentes | OK |
| Timeline cliente sem estados internos | OK |
| Recompra monta carrinho com dados atuais | OK |
| Sessão persistente configurada | OK |

## Arquivos principais

| Arquivo | Papel |
|---------|--------|
| `fal-pecas/supabase/migrations/20261004040000_fase7a_order_lifecycle.sql` | Schema + RPCs |
| `fal-pecas/src/lib/orderLifecycle.ts` | Projeção / labels |
| `fal-pecas/src/services/orders/orderTransitionService.ts` | Transição staff |
| `fal-pecas/src/services/orders/buyAgainService.ts` | Recompra |
| `fal-pecas/src/services/orders/orderDetailService.ts` | Detalhe + events |
| `fal-pecas/src/pages/Account/AccountOrderDetailPage.tsx` | UI timeline + recompra |

**Próximo:** F7B — Recepção e confirmação.
