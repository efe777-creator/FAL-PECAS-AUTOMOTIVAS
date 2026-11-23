# Checklist — Domínio Hostinger → Ads/Merchant (#15-B)

**Status:** alinhado a **Hostinger-only** · cutover DNS pendente de MARCHA  
**Branch:** `dev` · Sem MAIN sem OK  

**Decisão canônica (2026-11-23):** [FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23.md](./FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23.md)  
**Legado Netlify-as-host:** [FAL_DOMINIO_…_NETLIFY_2026-11-22.md](./FAL_DOMINIO_FALPECASAUTOMOTIVAS_NETLIFY_2026-11-22.md) (HISTÓRICO)

---

## Modelo alvo

| Peça | Alvo |
|------|------|
| Registrar + DNS + **host do front** | **Hostinger** |
| Netlify | **Inativo** (sem custom domain / sem prod) |
| Backend | Supabase (inalterado) |
| Canônico | `https://falpecasautomotivas.com` |

---

## DNS (Hostinger) — cutover

**Estado até decisão:** `@` / `www` ainda apontavam para Netlify (legado).  
**Alvo:** apontar `@` e `www` **somente** para o host Hostinger do site FAL.

1. Site Hostinger com `dist` (SPA) no ar e smoke OK  
2. Remover ALIAS/CNAME → `*.netlify.app`  
3. Criar registros do painel Hostinger para o site (A/AAAA ou CNAME conforme plano)  
4. SSL no Hostinger estável  
5. Smoke: HTTPS 200; **Server ≠ Netlify**

---

## App / env (produção)

1. `VITE_SITE_ORIGIN=https://falpecasautomotivas.com` (canônico https)  
2. IDs reais: `VITE_GTM_ID` (preferencial) e/ou GA/Meta  
3. Rebuild + publish **no Hostinger** (só MAIN / prod com autorização eFe)  
4. Supabase Auth: Site URL + Redirect URLs no domínio final  

---

## Google

1. GA4 / GTM / Google Ads — conversões no domínio final  
2. Merchant Center — verificar propriedade do domínio/site  
3. Feed de produtos com URLs absolutas do domínio (não `*.netlify.app`)  
4. Smoke: “Só essenciais” → sem hits; “Aceitar analytics” → tags + Consent granted  

---

## Inativar Netlify (após DNS estável)

1. Remover custom domain do site eFe (e fernando se houver)  
2. Pausar auto-deploy / uso prod  
3. Manter archive 7–14d (rollback no doc de decisão §6)  

---

## Fora deste checklist

Campanhas pagas em volume · CAPI Meta server · landings Ads dedicadas · migrar Supabase
