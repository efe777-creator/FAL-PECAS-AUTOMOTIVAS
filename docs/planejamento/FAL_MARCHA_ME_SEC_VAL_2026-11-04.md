# VAL — M-ME-SEC secrets + migration

**Data:** 2026-11-04  
**Runtime:** `wtbpwuiayednvlhvuhbh`  

## Migration

| Item | Estado |
|------|--------|
| `shipping_quotes` | **PASS** presente |
| `resolve_me_shipping_option` | **PASS** presente |
| `melhorenvio_webhook_events` | **PASS** (apply #57) |

## Secrets Edge

| Secret | Estado 04/11 |
|--------|----------------|
| `MELHOR_ENVIO_USER_AGENT` | **SET** `FAL Pecas Automotivas (efe.comercioltda@gmail.com)` |
| `MELHOR_ENVIO_WEBHOOK_SECRET` | **SET** (aleatório) |
| `MELHOR_ENVIO_TOKEN` | **PENDENTE** — login sandbox rejeitou senha do e-mail local; eFe redefine senha / cola Bearer |

## Como colar o TOKEN (humano)

No painel Melhor Envio **sandbox** → Integrações / OAuth → copiar `access_token`, depois:

```powershell
cd fal-pecas
npx supabase secrets set --yes "MELHOR_ENVIO_TOKEN=COLE_AQUI" --project-ref wtbpwuiayednvlhvuhbh
```

Nunca `VITE_*`. Base API já fixa no código: `https://sandbox.melhorenvio.com.br`.

## STOP parcial

Migration + UA + webhook OK. Smoke HTTP ME espera `MELHOR_ENVIO_TOKEN`.

**Assinatura agente:** VAL M-ME-SEC parcial 2026-11-04.
