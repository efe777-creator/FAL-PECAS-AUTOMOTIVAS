# VAL — Smoke calculate Melhor Envio (M7 prep)

**Data:** 2026-11-04 (rev. 16:55)  
**Runtime:** `wtbpwuiayednvlhvuhbh`

## Evidência

| Passo | Resultado |
|-------|-----------|
| TOKEN ≠ `COLE_AQUI` | **PASS** (hash Edge `585c9be7…`, token pessoal prod “FAL Pecas Edge”) |
| Secret `MELHOR_ENVIO_API_BASE` | `https://melhorenvio.com.br` |
| Edges redeploy | **PASS** (`quote-shipping`, `melhorenvio-label`) |
| Smoke `quote-shipping` (user JWT efêmero) | **PASS** HTTP 200 · `status=ok` · **12** opções · 1ª SEDEX `amount=11.89` (`meq:…:2`) |

## FIND-ME-401 — FECHADO

Bearer real + API base produção → calculate autenticado. Cotação apenas (sem purchase/generate).

## Aceite

- [x] TOKEN real no Edge  
- [x] Smoke calculate `options > 0`  
- [ ] Default loja ME em Netlify (ainda **mock** / D-FRETE B)  
- [ ] M7 ops E2E etiqueta (após pedido âncora + Expedição)

**Assinatura agente:** smoke calc ME PASS 2026-11-04.
