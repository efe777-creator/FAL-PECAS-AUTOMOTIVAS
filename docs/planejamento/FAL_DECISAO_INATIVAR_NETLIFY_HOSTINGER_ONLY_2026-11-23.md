# Decisão — Inativar Netlify · Hostinger only

**Data:** 2026-11-23 · **Auth:** eFe — `MARCHA`  
**Branch docs:** `dev` · Sem MAIN sem OK  
**Status:** **DECISÃO TRAVADA** · cutover técnico **DONE** (2026-11-23)  
**VAL docs:** [FAL_MARCHA_DECISAO_HOSTINGER_ONLY_VAL_2026-11-23.md](./FAL_MARCHA_DECISAO_HOSTINGER_ONLY_VAL_2026-11-23.md)  
**VAL cutover:** [FAL_MARCHA_HOSTINGER_ONLY_CUTOVER_VAL_2026-11-23.md](./FAL_MARCHA_HOSTINGER_ONLY_CUTOVER_VAL_2026-11-23.md)

**Supersede:** [FAL_DOMINIO_FALPECASAUTOMOTIVAS_NETLIFY_2026-11-22.md](./FAL_DOMINIO_FALPECASAUTOMOTIVAS_NETLIFY_2026-11-22.md) (histórico)  
**Checklist Ads:** [FAL_CHECKLIST_HOSTINGER_DOMINIO_ADS_15B_2026-11-22.md](./FAL_CHECKLIST_HOSTINGER_DOMINIO_ADS_15B_2026-11-22.md)

---

## 1. Decisão

| # | Regra |
|---|--------|
| D1 | **Hostinger** é o **único** host do storefront FAL |
| D2 | **Netlify** fica **inativo** (sem tráfego de produção, sem custom domain, sem deploy de rotina) |
| D3 | Domínio `falpecasautomotivas.com` / `www` aponta **só** para Hostinger |
| D4 | **Supabase** (Auth / DB / Edges / Storage) **permanece** — fora deste cutover de host |
| D5 | Espelhos Netlify eFe / fernando: **não** usar como prod; pausar ou arquivar após cutover estável |
| D6 | A MARCHA de decisão **documentou** regras; o cutover técnico (`MARCHA HOSTINGER-ONLY CUTOVER`) executa DNS/host/Netlify off |

---

## 2. Motivo

- Unificar DNS + hospedagem no mesmo provedor  
- Encerrar dual-site Netlify (eFe / fernando) e risco de crédito/limite  
- Um canônico claro para MVP / Ads / Auth  

---

## 3. Estado anterior (fato — até 2026-11-22)

| Peça | Valor |
|------|--------|
| Registrar | Hostinger |
| Host front | Netlify `fal-pecas-automotivas-efe` (`79994809-2fb1-4faf-bce5-4feac9a7d3a3`) |
| DNS `@` | ALIAS → `fal-pecas-automotivas-efe.netlify.app` |
| DNS `www` | CNAME → `fal-pecas-automotivas-efe.netlify.app` |
| Fallback | `https://fal-pecas-automotivas-efe.netlify.app` |
| Build legado | `netlify.toml` (base `fal-pecas`, publish `dist`, SPA `/*` → `index.html`) |

---

## 4. Alvo Hostinger-only

| Peça | Alvo |
|------|------|
| Build | `fal-pecas` → `npm run build` → `dist` |
| Publish | Hostinger (static / Node do plano do site) |
| SPA | fallback `/*` → `index.html` (equiv. redirects Netlify) |
| Env | `VITE_SITE_ORIGIN=https://falpecasautomotivas.com` (+ demais `VITE_*`) |
| Auth | Supabase Site URL + Redirect URLs no domínio |
| SSL | Hostinger / CDN do plano |
| SEO | `sitemap.xml` / `robots.txt` servidos como estáticos (não cair no SPA) |

**Fora:** migrar Supabase; mudar pay/frete; abrir MAIN; deletar conta Netlify no dia 0.

---

## 5. Checklist cutover (`MARCHA HOSTINGER-ONLY CUTOVER` — DONE 2026-11-23)

### A — Preparar Hostinger

- [x] Site/app criado; build/publish `dist` OK  
- [x] Env de produção setadas (sem secrets no git) — `.env.production.local` → bundle  
- [x] Smoke URL Hostinger: Home / carrinho / frete / sticky  

### B — DNS (Hostinger)

- [x] Remover ALIAS/CNAME que apontam para Netlify  
- [x] Apontar `@` e `www` para o host Hostinger (A `149.62.37.129` + www→apex)  
- [x] Smoke: resposta **não** é Server Netlify; HTTPS 200 · **LiteSpeed**  

### C — Inativar Netlify

- [x] Remover custom domain `falpecasautomotivas.com` / `www` do site eFe  
- [x] Espelho fernando: sem domain FAL (já `*.netlify.app`)  
- [x] Uso prod desligado (site eFe só URL netlify.app; sem domain)  
- [x] Manter histórico 7–14d para rollback  

### D — App / Auth / Ads

- [x] Rebuild com `VITE_SITE_ORIGIN` canônico  
- [x] Supabase Auth URLs (`config push`)  
- [x] Atualizar #15-B (host Hostinger; Ads IDs ainda opcionais)  
- [x] Atualizar VALs / ponteiros  

### E — Aceite

- [x] Home + smoke pay/frete no domínio (G8 fora)  
- [x] eFe: “Netlify inativo · Hostinger only · env migrada · tip alinhado”

---

## 6. Rollback

1. Reapontar DNS `@` / `www` para Netlify `fal-pecas-automotivas-efe.netlify.app`  
2. Reassociar custom domain no Netlify  
3. Não apagar site Netlify até aceite estável (janela 7–14d)

---

## 7. MARCHA HOSTINGER-ONLY CUTOVER

**Status:** **DONE** — VAL [FAL_MARCHA_HOSTINGER_ONLY_CUTOVER_VAL_2026-11-23.md](./FAL_MARCHA_HOSTINGER_ONLY_CUTOVER_VAL_2026-11-23.md)  
**TIP_RC:** `9fbc8d7` · Host `u543028447` · Auth wtbp alinhado ao domínio  
**Fora ainda:** G8 · Ads IDs · deletar conta Netlify · MAIN

---

## 8. Antiregress

| Peça | Papel |
|------|--------|
| `fal-pecas/src/lib/hostingerOnlyAntiregress.test.ts` | Trava docs + `.env.example` + `netlify.toml` LEGADO |
| `netlify.toml` header | LEGADO — não host canônico |
| `.env.example` | `VITE_SITE_ORIGIN` canônico = `falpecasautomotivas.com` |

## 9. Nota histórica (MARCHA decisão-docs)

A MARCHA de **decisão** (só docs) não alterava painéis. O cutover técnico subsequente **alterou** DNS/host/Auth/Netlify domain — ver VAL cutover.
