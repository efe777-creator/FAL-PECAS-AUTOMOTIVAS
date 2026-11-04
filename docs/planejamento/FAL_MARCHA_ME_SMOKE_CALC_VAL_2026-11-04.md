# VAL — Smoke calculate Melhor Envio (M7 prep)

**Data:** 2026-11-04  
**Runtime:** `wtbpwuiayednvlhvuhbh`

## Evidência

| Passo | Resultado |
|-------|-----------|
| TOKEN ≠ `COLE_AQUI` | **PASS** (hash mudou) |
| Secret `MELHOR_ENVIO_API_BASE` | `https://melhorenvio.com.br` (token veio do painel **produção**) |
| Edges redeploy | **PASS** (`quote-shipping`, `melhorenvio-label` + `meApiBase()`) |
| Smoke `quote-shipping` (user JWT efêmero) | **FAIL** HTTP 502 · ME **401 Unauthenticated** |

## FIND-ME-401

Bearer no Edge **não autentica** na API (`Unauthenticated`). Causas típicas:

1. Token colado incompleto / com espaços / errado  
2. Token já revogado / gerado só no painel e nunca copiado na hora  
3. Token de app sem escopo de shipment  

**Ação eFe (painel aberto):** Integrações → Permissões → **Gerar novo token** → copiar **uma vez** →

```powershell
cd fal-pecas
npx supabase secrets set --yes "MELHOR_ENVIO_TOKEN=<cole_o_token_sem_Bearer>" --project-ref wtbpwuiayednvlhvuhbh
npx supabase functions deploy quote-shipping melhorenvio-label --project-ref wtbpwuiayednvlhvuhbh --yes
```

Manter `MELHOR_ENVIO_API_BASE=https://melhorenvio.com.br` enquanto o token for de **produção**.  
Sandbox: base default + token sandbox (conta sandbox ainda sem login).

**Aviso:** purchase/generate em produção gasta saldo real — preferir dry-run / quote até smoke cotação PASS.

## Código

- `meApiBase()` em `_shared/melhorEnvioCore.ts`  
- Override `MELHOR_ENVIO_API_BASE`  
- Trim/`Bearer` strip no TOKEN  

**Assinatura agente:** smoke calc ME 401 2026-11-04.
