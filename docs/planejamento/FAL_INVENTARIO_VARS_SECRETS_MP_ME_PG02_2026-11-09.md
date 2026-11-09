# PG02 — Inventário de variáveis e secrets (MP + ME)

**Data:** 2026-11-09  
**Escopo:** inventário apenas · **não aplicar** secrets · **não** deploy  
**Alvo:** conta nova (Netlify + Supabase) no momento certo

---

## Build loja (Netlify / Vite) — prefixo `VITE_`

| Variável | Teste / homolog | Produção (conta nova) | Obrigatória ops |
|----------|-----------------|----------------------|-----------------|
| `VITE_SUPABASE_URL` | projeto atual ou novo | URL do projeto da conta | Sim |
| `VITE_SUPABASE_ANON_KEY` | anon key | anon key | Sim |
| `VITE_PAYMENT_PROVIDER` | `mercadopago` | `mercadopago` | Sim (MP nesta onda) |
| `VITE_MP_PUBLIC_KEY` | `TEST-…` | `APP-…` | Sim |
| `VITE_SHIPPING_PROVIDER` | `melhorenvio` | `melhorenvio` | Sim |
| `VITE_SHIPPING_ME_ENV` | omitir ou `sandbox` | `production` | Sim em prod (UI/disclaimer) |
| `VITE_WHATSAPP_PHONE` | opcional | número comercial | Recomendado |
| `VITE_SITE_ORIGIN` | URL preview/efe | URL loja canônica | Recomendado |
| Identidade (`VITE_STORE_*`) | opcional | CNPJ/nome/contato | Recomendado |

**Nunca** no build: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MELHOR_ENVIO_TOKEN`.

---

## Edge secrets (Supabase) — sem `VITE_`

| Secret | Teste | Produção | Usado por |
|--------|-------|----------|-----------|
| `MP_ACCESS_TOKEN` | `TEST-…` / APP_USR teste | `APP_USR…` produção | `create-mp-payment`, `mercado-pago-webhook` |
| `MP_WEBHOOK_SECRET` | secret do painel TEST | secret do painel PROD | `mercado-pago-webhook` |
| `MP_ENV` | `test` | `production` | docs/ops (token deve casar) |
| `MELHOR_ENVIO_TOKEN` | token sandbox ME | token produção ME | `quote-shipping`, `melhorenvio-label` |
| `MELHOR_ENVIO_USER_AGENT` | app + e-mail cadastrado ME | idem prod | ME HTTP |
| `MELHOR_ENVIO_API_BASE` | omitir (= sandbox) ou URL sandbox | `https://melhorenvio.com.br` | `meApiBase()` |
| `payments_enabled` | opcional | `true` se usado | gate operacional (se presente) |

---

## Webhook Mercado Pago

```
https://<project-ref>.supabase.co/functions/v1/mercado-pago-webhook
```

Configurar no painel MP da **mesma** conta/ambiente do Access Token.  
Eventos: pagamentos (payment created/updated). Secret = `MP_WEBHOOK_SECRET`.

---

## Pareamento obrigatório (evitar misturar ambientes)

| Front | Edge | ME base |
|-------|------|---------|
| `VITE_MP_PUBLIC_KEY=TEST-` | `MP_ACCESS_TOKEN` teste + `MP_ENV=test` | — |
| `VITE_MP_PUBLIC_KEY=APP-` | `MP_ACCESS_TOKEN` prod + `MP_ENV=production` | — |
| `VITE_SHIPPING_ME_ENV=sandbox` | token sandbox | default sandbox / API sandbox |
| `VITE_SHIPPING_ME_ENV=production` | token prod | `MELHOR_ENVIO_API_BASE=https://melhorenvio.com.br` |

Misturar TEST front com token prod (ou o inverso) gera falha de Brick/Pix ou cobrança no ambiente errado.

---

## Checklist no momento da conta nova (humano)

1. Criar app MP produção → Public Key + Access Token + webhook secret.  
2. Autorizar app ME produção → token + User-Agent.  
3. Colar build vars no Netlify da conta nova.  
4. `supabase secrets set …` no projeto vinculado (sem commitar valores).  
5. Redeploy Edges: `create-mp-payment`, `mercado-pago-webhook`, `quote-shipping`, `melhorenvio-label`.  
6. Smoke G3/G4 reais.

**Assinatura:** PG02 inventário PASS · sem apply · 2026-11-09.
