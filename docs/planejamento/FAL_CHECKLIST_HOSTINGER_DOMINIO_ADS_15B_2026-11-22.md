# Checklist — Domínio Hostinger → Ads/Merchant (#15-B)

**Status:** alinhado a **Hostinger-only** · host **DONE** · Ads/Merchant IDs ainda **opcionais**  
**Branch:** `dev` · Sem MAIN sem OK  

**Decisão canônica (2026-11-23):** [FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23.md](./FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23.md)  
**VAL cutover:** [FAL_MARCHA_HOSTINGER_ONLY_CUTOVER_VAL_2026-11-23.md](./FAL_MARCHA_HOSTINGER_ONLY_CUTOVER_VAL_2026-11-23.md)  
**Legado Netlify-as-host:** [FAL_DOMINIO_…_NETLIFY_2026-11-22.md](./FAL_DOMINIO_FALPECASAUTOMOTIVAS_NETLIFY_2026-11-22.md) (HISTÓRICO)

---

## Modelo alvo

| Peça | Alvo | Estado 2026-11-23 |
|------|------|-------------------|
| Registrar + DNS + **host do front** | **Hostinger** | **DONE** (LiteSpeed · A Hostinger) |
| Netlify | **Inativo** (sem custom domain / sem prod) | **DONE** (eFe domain off) |
| Backend | Supabase (inalterado) | OK |
| Canônico | `https://falpecasautomotivas.com` | **DONE** + Auth URLs |

---

## DNS (Hostinger) — cutover

**DONE:** `@` / `www` no Hostinger; smoke HTTPS 200 · Server ≠ Netlify.

1. [x] Site Hostinger com `dist` (SPA) no ar e smoke OK  
2. [x] Remover ALIAS/CNAME → `*.netlify.app`  
3. [x] Registros Hostinger (A / www→apex)  
4. [x] SSL estável  
5. [x] Smoke: HTTPS 200; **Server ≠ Netlify**

---

## App / env (produção)

1. [x] `VITE_SITE_ORIGIN=https://falpecasautomotivas.com` (canônico https)  
2. [ ] IDs reais: `VITE_GTM_ID` (preferencial) e/ou GA/Meta — **opcional / depois**  
3. [x] Rebuild + publish **no Hostinger** (tip `dev`; MAIN só com OK eFe)  
4. [x] Supabase Auth: Site URL + Redirect URLs no domínio final  

---

## Google

1. [ ] GA4 / GTM / Google Ads — conversões no domínio final  
2. [ ] Merchant Center — verificar propriedade do domínio/site  
3. [ ] Feed de produtos com URLs absolutas do domínio (não `*.netlify.app`)  
4. [ ] Smoke: “Só essenciais” → sem hits; “Aceitar analytics” → tags + Consent granted  

---

## Inativar Netlify (após DNS estável)

1. [x] Remover custom domain do site eFe (fernando sem domain FAL)  
2. [x] Uso prod desligado (URL só `*.netlify.app`)  
3. [x] Archive 7–14d (rollback no doc de decisão §6)  

---

## Fora deste checklist

Campanhas pagas em volume · CAPI Meta server · landings Ads dedicadas · migrar Supabase · G8
