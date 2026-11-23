# Decisão — Inativar Netlify · Hostinger only

**Data:** 2026-11-23 · **Auth:** eFe — `MARCHA`  
**Branch docs:** `dev` · Sem MAIN / sem cutover DNS sem OK  
**Status:** **DECISÃO TRAVADA** — cutover técnico = MARCHA separada  
**VAL:** [FAL_MARCHA_DECISAO_HOSTINGER_ONLY_VAL_2026-11-23.md](./FAL_MARCHA_DECISAO_HOSTINGER_ONLY_VAL_2026-11-23.md)

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
| D6 | Esta MARCHA **documenta** a decisão; **não** altera DNS, não desliga sites, não faz deploy |

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

## 5. Checklist cutover (próxima MARCHA — não executar aqui)

### A — Preparar Hostinger

- [ ] Site/app criado; build/publish `dist` OK  
- [ ] Env de produção setadas (sem secrets no git)  
- [ ] Smoke URL Hostinger: Home / login / carrinho  

### B — DNS (Hostinger)

- [ ] Remover ALIAS/CNAME que apontam para Netlify  
- [ ] Apontar `@` e `www` para o host Hostinger (registros do painel)  
- [ ] TTL baixo durante cutover  
- [ ] Smoke: resposta **não** é Server Netlify; HTTPS 200  

### C — Inativar Netlify

- [ ] Remover custom domain `falpecasautomotivas.com` / `www` do site eFe  
- [ ] Remover do espelho fernando se houver  
- [ ] Pausar auto-deploy / desligar uso prod  
- [ ] Manter histórico 7–14d para rollback  

### D — App / Auth / Ads

- [ ] Rebuild com `VITE_SITE_ORIGIN` canônico  
- [ ] Supabase Auth URLs  
- [ ] Atualizar #15-B (Merchant/Ads)  
- [ ] Atualizar VALs / ponteiros  

### E — Aceite

- [ ] Home + login + smoke pay/frete no domínio  
- [ ] eFe: “Netlify inativo · Hostinger only”

---

## 6. Rollback

1. Reapontar DNS `@` / `www` para Netlify `fal-pecas-automotivas-efe.netlify.app`  
2. Reassociar custom domain no Netlify  
3. Não apagar site Netlify até aceite **E**  

---

## 7. Próxima MARCHA

**Nome:** `MARCHA HOSTINGER-ONLY CUTOVER`  
**Pré-req:** site Hostinger servindo `dist` + env OK  
**STOP:** DNS só muda após smoke na URL Hostinger  
**Autorização:** eFe explícita (DNS / desligar Netlify / prod)

---

## 8. Antiregress

| Peça | Papel |
|------|--------|
| `fal-pecas/src/lib/hostingerOnlyAntiregress.test.ts` | Trava docs + `.env.example` + `netlify.toml` LEGADO |
| `netlify.toml` header | LEGADO — não host canônico |
| `.env.example` | `VITE_SITE_ORIGIN` canônico = `falpecasautomotivas.com` |

## 9. STOP desta MARCHA (docs)

Código de loja, DNS ao vivo e painéis Netlify/Hostinger **não** foram alterados nesta decisão.  
Só autoridade documental + antiregress: Hostinger-only = canônico; Netlify-as-host = histórico.
