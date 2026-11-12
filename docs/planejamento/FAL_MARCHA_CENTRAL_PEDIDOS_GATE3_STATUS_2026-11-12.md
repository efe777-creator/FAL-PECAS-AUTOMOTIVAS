# Gate 3 — status Central de Pedidos

**Data:** 2026-11-12  
**Auth:** eFe — MARCHA  
**Env FE:** `VITE_MP_ENV=production` · `VITE_SHIPPING_ME_ENV=production`

## Critérios Gate 3 (matriz Fase 3)

| Área | Status |
|------|--------|
| A (unit/RPC/SEC) | ✅ |
| M staff browser | ✅ |
| PAY-03 MP → análise | ✅ Pix prod + sync (`66dd89ff` / MP `189071738498`) — [CP-PAY VAL](./FAL_MARCHA_CP_PAY_PIX_PROD_SMOKE_VAL_2026-11-11.md) |
| ME-02 quote→prepare | ✅ live `6eb61dd5` |
| ME-03 purchase | ❌ **não executado** — ME produção; compra gasta saldo |

## Decisão

**Gate 3 não aberto** até:

- eFe autorizar **ME-03** (compra etiqueta R$~11 em prod), **ou**
- eFe declarar Gate 3 com ME-03 adiado (etiqueta fora do caminho crítico own/mock já coberto).

Webhook MP prod: gap conhecido (MCP `notifications_history` vazio / config sandbox vs prod). Mitigação `sync-mp-payment` já validada.

## Git / deploy

Commits locais apenas. **Sem push/deploy** até autorização eFe.
