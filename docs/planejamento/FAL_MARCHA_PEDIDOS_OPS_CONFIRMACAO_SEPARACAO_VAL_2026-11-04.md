# VAL — MARCHA_PEDIDOS_OPS_CONFIRMACAO_SEPARACAO

**Data:** 2026-11-04  
**Auth:** MARCHA (M2 pós M1)  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**D-FRETE:** **B** (inalterado)

---

## Escopo

Fechar UX operacional do fluxo **confirmação → separação → pronto para envio** (F7B/F7C já no SQL).  
**Fora:** cron expiry; Melhor Envio; aceite de ressalva pelo cliente; mudança de roles.

---

## Entrega (FATO)

| Item | Estado |
|------|--------|
| Banner **Próximo passo** por status | OK |
| `pagamento_aprovado`/`recebido` → botão **Iniciar análise** | OK |
| Progresso separação `n/total` + **Marcar todos** | OK |
| **Concluir separação** só com todos separados (UI) | OK |
| Chips fila: `pronto_para_envio` + `enviado` | OK |
| Busca lista (id / cliente / pagamento) | OK |
| Labels eventos `order_expired_unpaid` / `item_separated` | OK |
| `tsc --noEmit` | PASS |

### Arquivos

- `fal-pecas/src/lib/orderLifecycle.ts`
- `fal-pecas/src/pages/admin/orders/AdminOrderDetailPage.tsx`
- `fal-pecas/src/pages/admin/orders/AdminOrdersPage.tsx`

Sem migration nova (RPCs F7B/F7C já no wtbp).

---

## Aceite

1. Detalhe em `confirmado`/`em_separacao` mostra progresso e bloqueia concluir sem checklist.  
2. Lista filtra por busca e chips de expedição.  
3. Pedido `pronto_para_envio` ainda mostra bloco Expedição (regressão).

---

## Follow-ups

- Cron `expire_unpaid_orders`  
- Aceite de ressalva pelo cliente (spec F7)  
- `MARCHA_LOGISTICA_FILTROS_HISTORICO_MEDIDAS`

**Resultado:** **PASS** (código). Deploy = PR/Netlify.

**Assinatura agente:** VAL pedidos ops confirmação/separação 2026-11-04.
