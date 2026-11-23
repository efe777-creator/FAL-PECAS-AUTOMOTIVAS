# VAL — MARCHA HOSTINGER-ONLY CUTOVER

**Data:** 2026-11-23 · **Branch:** `dev` · Sem MAIN  
**Auth:** eFe — tip Hostinger + migração VITE + inativar Netlify  
**Decisão:** [FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23.md](./FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23.md)  
**#15-B:** [FAL_CHECKLIST_HOSTINGER_DOMINIO_ADS_15B_2026-11-22.md](./FAL_CHECKLIST_HOSTINGER_DOMINIO_ADS_15B_2026-11-22.md)  
**TIP_RC:** `9fbc8d7` (sitemap Hostinger) · base tip `8312138` (carrinho/cotação/antiregress)

## Escopo

Cutover técnico: build `dist` com checklist `VITE_*` → ZIP → Hostinger static; Auth no domínio; Netlify sem custom domain FAL.  
**Fora:** G8 · Ads IDs · deletar conta Netlify · migrar projeto Supabase · MAIN.

## Aceite

| Critério | Status |
|----------|--------|
| Domínio = tip Hostinger (`Server: LiteSpeed`, HTTPS 200) | **PASS** |
| Auth Site URL + Redirects = `https://falpecasautomotivas.com` (+ www + localhost) | **PASS** |
| Netlify eFe sem `falpecasautomotivas.com` / `www` | **PASS** |
| Netlify fernando sem domain FAL (já só `*.netlify.app`) | **PASS** |
| Nenhuma secret Edge no Hostinger / no git | **PASS** |
| eFe: Netlify inativo · Hostinger only · env migrada · tip alinhado | **PASS** |

## Matriz env (checklist cutover — uma vez)

### A — `VITE_*` Netlify → build Hostinger

| Key | Destino | Status |
|-----|---------|--------|
| `VITE_SUPABASE_URL` | `.env.production.local` (não git) → `dist` | **PASS** |
| `VITE_SUPABASE_ANON_KEY` | idem | **PASS** |
| `VITE_PAYMENT_PROVIDER` | idem (`mercadopago`) | **PASS** |
| `VITE_MP_PUBLIC_KEY` | idem (live public) | **PASS** |
| `VITE_MP_ENV` | idem (`production`) | **PASS** |
| `VITE_SHIPPING_PROVIDER` | idem (`melhorenvio`) | **PASS** |
| `VITE_SHIPPING_ME_ENV` | idem (`production`) | **PASS** |
| `VITE_WHATSAPP_PHONE` | idem | **PASS** |
| `VITE_STORE_LEGAL_NAME` | idem | **PASS** |
| `VITE_STORE_PHONE` | idem | **PASS** |
| `VITE_STORE_CITY_STATE` | idem | **PASS** |
| `VITE_SEARCH_NL_LLM` | idem (`1`) | **PASS** |

### B — extras build Hostinger

| Key | Valor alvo | Status |
|-----|------------|--------|
| `VITE_SITE_ORIGIN` | `https://falpecasautomotivas.com` | **PASS** |
| `VITE_STORE_CNPJ` / `VITE_STORE_EMAIL` | opcional | omitido (ok) |
| `VITE_PLATE_NL_LLM` | herda SEARCH | omitido (ok) |
| Auth recovery / Ads IDs | só se já usados | omitido (ok; #15-B Ads depois) |

### C — NÃO no Hostinger / NÃO no Vite

| Key / classe | Onde | Status |
|--------------|------|--------|
| `MP_ENV` (sem VITE) | legado Netlify — **não** migrar | **PASS** (omitido) |
| `MP_*` / `ASAAS_*` / `MELHOR_ENVIO_*` / `GROQ_*` / placa / OTP | Supabase Edge secrets `wtbpwuiayednvlhvuhbh` | **PASS** (audit nomes; não Hostinger) |
| `VITE_ALLOW_CATALOG_MOCKS` / `VITE_FAL_VISUAL_XR` | nunca prod | **PASS** (omitido) |

**Nota PG02:** inventário detalhado permanece em [FAL_INVENTARIO_VARS_SECRETS_MP_ME_PG02_2026-11-09.md](./FAL_INVENTARIO_VARS_SECRETS_MP_ME_PG02_2026-11-09.md); SoT de build pós-cutover = `.env.production.local` / CI que gera `dist` Hostinger — **não** Netlify env.

## Deploy / Auth / Netlify (fatos)

| Peça | Fato |
|------|------|
| Host | Hostinger `u543028447` · `public_html` · static |
| Deploy | `hosting_deploy-static-website` · ZIP `dist` |
| Smoke | Home/carrinho/frete/sticky; domínio LiteSpeed 200 |
| Auth push | `supabase config push` — `site_url` + `additional_redirect_urls` |
| Netlify eFe | `custom_domain=null` · `domain_aliases=[]` · URL = `*.netlify.app` |
| Netlify fernando | sem domain FAL |

## Gates

| Gate | Status |
|------|--------|
| `hostingerOnlyAntiregress` | PASS (pré-cutover; docs atualizados mantêm travas) |
| Tip `dev` ahead origin | tip commits locais alinhados Hostinger |

## Verificação minuciosa (2026-11-23 — pós-cutover)

| Check | Evidência | Status |
|-------|-----------|--------|
| DNS A / www CNAME | `149.62.37.129` · www→apex | **PASS** |
| HTTPS + Server | LiteSpeed 200 Home/carrinho/login/www/sitemap/robots | **PASS** |
| Tip assets live = dist | `index-CHFGi8aX.js` + `index-yrS9Uiic.css` | **PASS** |
| `VITE_*` A+B no `.env.production.local` | 13 keys · sem secrets Edge | **PASS** |
| Bundle live | supabase URL · origin · MP public · ME · telefone | **PASS** |
| Auth remote | `config diff` 0 · site_url domínio | **PASS** |
| Netlify eFe | `custom_domain=null` · só `*.netlify.app` | **PASS** |
| Edge ME live | `quote-shipping` provider `melhorenvio` mode `live` options OK | **PASS** |
| Edge pay | `create-mp-payment` responde `401 unauthorized` (Edge up) | **PASS** |
| Edge placa | `plate-lookup` responde `invalid_plate` | **PASS** |
| Secrets Edge nomes | MP/ME/Asaas/GROQ/placa/OTP presentes | **PASS** |
| UI browser | Home vitrine · carrinho vazio · login form | **PASS** |
| Higiene prod | removido `public/dev-mp-*.html` · redeploy · antiregress | **PASS** |
| Gates | `hostingerOnly` 7 · `compatUi` 23 · `tsc` limpo | **PASS** |

## STOP / fora

G8 approve · campanhas Ads · apagar conta Netlify · MAIN.
