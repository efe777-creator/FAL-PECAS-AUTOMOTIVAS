# VAL — M-ME-SEC secrets + migration

**Data:** 2026-11-04 (rev. 16:55)  
**Runtime:** `wtbpwuiayednvlhvuhbh`  

## Migration

| Item | Estado |
|------|--------|
| `shipping_quotes` | **PASS** |
| `resolve_me_shipping_option` | **PASS** |
| `melhorenvio_webhook_events` | **PASS** |

## Secrets Edge

| Secret | Estado |
|--------|--------|
| `MELHOR_ENVIO_USER_AGENT` | **SET** |
| `MELHOR_ENVIO_WEBHOOK_SECRET` | **SET** |
| `MELHOR_ENVIO_API_BASE` | **SET** (`https://melhorenvio.com.br`) |
| `MELHOR_ENVIO_TOKEN` | **SET** (token pessoal produção; hash ≠ `COLE_AQUI`) |

### FIND-ME-TOKEN-001 — FECHADO

Literal `COLE_AQUI` substituído por JWT gerado no painel produção (Integrações → Gerar token, app “FAL Pecas Edge”, escopos shipping-*).  
Smoke calculate **PASS** — ver [ME SMOKE CALC VAL](./FAL_MARCHA_ME_SMOKE_CALC_VAL_2026-11-04.md).

## Deploy

Edges `quote-shipping` + `melhorenvio-label` redeployed 04/11 pós-TOKEN.

## Aceite

- [x] Migration  
- [x] UA + WH + API_BASE  
- [x] TOKEN Bearer real  
- [x] Smoke calculate ≠ 401 ME  

## STOP

M-ME-SEC **PASS**. Não habilitar ME como default Netlify sem D-FRETE C.

**Assinatura agente:** VAL M-ME-SEC PASS 2026-11-04.
