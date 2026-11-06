# VAL — O1-F: motivo obrigatório ao cliente recusar alterações

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** recusa em `aguardando_decisao` sem motivo (UI + RPC)

## Entrega

| Peça | Mudança |
|------|---------|
| `AccountOrderDetailPage` | `requireReason` na recusa |
| `customerRespondOrderDecision` | envia `p_reason`; valida reject sem texto |
| Migration `20261106140000_…` | RPC exige motivo no reject; grava em `payload.reason` |
| Timeline conta/admin | mostra motivo |

## Critérios

- [x] Recusar sem motivo → diálogo bloqueia / RPC rejeita
- [x] Motivo visível no evento (cliente e operador)
- [x] `tsc -b` OK
- [ ] **Aplicar migration no wtbp** (gate ops)

## Gate humano

Deploy SQL no projeto Supabase antes do smoke E2E.
