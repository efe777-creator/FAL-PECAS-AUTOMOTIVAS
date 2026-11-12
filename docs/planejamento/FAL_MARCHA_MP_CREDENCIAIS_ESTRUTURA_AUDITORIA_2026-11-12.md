# VAL — Auditoria credenciais MP + estrutura — 2026-11-12

**Runtime:** local · Supabase `wtbpwuiayednvlhvuhbh` · Netlify `fal-pecas-automotivas` · app live `6371863177010206`

## Veredito

| Camada | Esperado | Achado | Status |
| --- | --- | --- | --- |
| Front Public Key (local `.env.local`) | `APP_USR-{uuid}` prod | `APP_USR-ae216fe5-…` len 44 · `payment_methods` OK · Brick init OK | PASS |
| Edge `MP_ACCESS_TOKEN` | Access Token prod do mesmo app | Fingerprint SHA = app live `6371863177010206` · `/users/me` collector `3667581511` MLB active | PASS |
| Pareamento local PK ↔ Edge token | Mesmo app / ambiente | Mesmo collector; token ≠ PK (tipos corretos) | PASS |
| Netlify `VITE_MP_PUBLIC_KEY` | Mesma PK prod do Edge | **Antes:** `TEST-e0ce3d45-…` (desalinhada do token prod) · **Depois:** `APP_USR-ae216fe5-…` em todos os contexts | CORRIGIDO |
| `VITE_PAYMENT_PROVIDER` | `mercadopago` | Netlify + local | PASS |
| Estrutura secrets | PK só Vite · token só Edge | Sem Access Token no front; `.env.local` gitignored | PASS |
| App painel live | Domínios + webhook topics | `domains=[]` · `notifications_topics=[]` · callback URL já setada | AÇÃO HUMANA |
| App sandbox MCP `8320396999442614` | Homolog isolada | Credenciais TEST próprias; **não** misturar com live | OK (separado) |

## Estrutura correta (referência)

```
Browser  →  VITE_MP_PUBLIC_KEY  →  Card Brick / Secure Fields (PCI)
Browser  →  createFalPayment    →  Edge create-mp-payment
Edge     →  MP_ACCESS_TOKEN     →  api.mercadopago.com/v1/payments
MP       →  webhook HMAC        →  Edge mercado-pago-webhook (MP_WEBHOOK_SECRET)
```

Misturar PK TEST no Netlify com token prod no Edge quebra cobrança (token de cartão de um ambiente não autentica no outro).

## Correção aplicada

1. Netlify site `fal-pecas-automotivas`: `VITE_MP_PUBLIC_KEY` atualizada para a PK prod alinhada ao Edge.
2. Admin MP: bloco de pareamento + IDs dos apps.
3. `.env.example`: formato `APP_USR-{uuid}` e aviso de pareamento.

## Ação humana (painel MP app `6371863177010206`)

1. **Domínios / sites:** cadastrar `localhost`, domínio Netlify e domínio canônico da loja.
2. **Webhooks:** manter URL `…/functions/v1/mercado-pago-webhook` e ativar tópicos `payment` (topics hoje vazios na API).
3. Após vars Netlify: confirmar deploy pronto (build precisa embedar a PK nova).

## Não é falha de credencial

Secure Fields travado em `loading` no localhost com PK prod válida + Brick init 200 indica problema de mount/PCI no client (já isolado em HTML vanilla), não PK inválida.
