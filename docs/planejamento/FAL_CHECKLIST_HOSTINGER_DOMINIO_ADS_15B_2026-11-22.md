# Checklist — Domínio Hostinger → Ads/Merchant (#15-B)

**Status:** aguardando domínio · **Não bloqueia #15-A**  
**Branch:** `dev` · Sem MAIN sem OK

**Atualização 2026-11-22:** domínio `falpecasautomotivas.com` contratado e DNS apontado para Netlify site `fal-pecas-automotivas-efe` — ver [FAL_DOMINIO_FALPECASAUTOMOTIVAS_NETLIFY_2026-11-22.md](./FAL_DOMINIO_FALPECASAUTOMOTIVAS_NETLIFY_2026-11-22.md).

Quando o domínio estiver na Hostinger e o front FAL continuar no Netlify (fluxo atual):

## DNS (Hostinger) — feito para falpecasautomotivas.com

1. `@` ALIAS → `fal-pecas-automotivas-efe.netlify.app`
2. `www` CNAME → `fal-pecas-automotivas-efe.netlify.app`
3. Aguardar SSL Let’s Encrypt no Netlify (`site.ssl=true` + Force HTTPS)

## App / env (produção)

1. `VITE_SITE_ORIGIN=https://www.seudominio…` (canônico com https)
2. IDs reais: `VITE_GTM_ID` (preferencial) e/ou GA/Meta
3. Rebuild + deploy produção (**só MAIN com autorização**)
4. Supabase Auth: Site URL + Redirect URLs no domínio final

## Google

1. GA4 / GTM / Google Ads — conversões apontando para o domínio final  
2. Merchant Center — verificar propriedade do domínio/site  
3. Feed de produtos com URLs absolutas do domínio (não preview Netlify)  
4. Smoke: “Só essenciais” → sem hits; “Aceitar analytics” → tags + Consent granted

## Fora deste checklist

Campanhas pagas em volume · CAPI Meta server · landings Ads dedicadas
