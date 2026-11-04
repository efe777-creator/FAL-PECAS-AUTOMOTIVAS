# VAL — M-ME-SEC secrets + migration

**Data:** 2026-11-04 (rev. 16:40)  
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
| `MELHOR_ENVIO_TOKEN` | **FAIL / PLACEHOLDER** |

### FIND-ME-TOKEN-001

`supabase secrets set … MELHOR_ENVIO_TOKEN=COLE_AQUI` gravou o literal **COLE_AQUI** (sha256 confirma).  
Não é Bearer sandbox válido → cotação/etiqueta ME falharão até substituir.

```powershell
cd fal-pecas
npx supabase secrets set --yes "MELHOR_ENVIO_TOKEN=<Bearer_real_do_sandbox>" --project-ref wtbpwuiayednvlhvuhbh
npx supabase functions deploy quote-shipping melhorenvio-label --project-ref wtbpwuiayednvlhvuhbh --yes
```

Obter Bearer: painel **sandbox.melhorenvio.com.br** → Integrações / app OAuth → `access_token`.  
Conta sandbox ≠ produção (login sandbox ainda rejeita a senha usada em produção).

## Deploy

Edges redeployed 04/11 — mas TOKEN inválido anula smoke.

## Aceite

- [x] Migration  
- [x] UA + WH  
- [ ] TOKEN Bearer real  
- [ ] Smoke calculate ≠ 401 ME  

## STOP

M-ME-SEC **reaberto** só no TOKEN. UA/WH/migration OK.

**Assinatura agente:** VAL M-ME-SEC FIND-ME-TOKEN-001 2026-11-04.
