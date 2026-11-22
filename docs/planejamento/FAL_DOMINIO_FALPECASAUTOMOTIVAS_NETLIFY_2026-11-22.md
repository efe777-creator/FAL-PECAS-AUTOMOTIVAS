# Domínio falpecasautomotivas.com → Netlify (Cursor / eFe)

**Data:** 2026-11-22 · **Branch:** `dev`  
**Site Netlify:** `fal-pecas-automotivas-efe` (`79994809-2fb1-4faf-bce5-4feac9a7d3a3`)  
**Registrar:** Hostinger

## Feito

| Passo | Status |
|-------|--------|
| Domínio ativo no portfolio Hostinger | ✓ |
| Netlify `custom_domain` = `falpecasautomotivas.com` | ✓ |
| Alias `www.falpecasautomotivas.com` | ✓ |
| DNS `@` ALIAS → `fal-pecas-automotivas-efe.netlify.app` | ✓ |
| DNS `www` CNAME → `fal-pecas-automotivas-efe.netlify.app` | ✓ |
| DNS público `www` → Netlify | ✓ (CNAME) |
| DNS apex ALIAS → Netlify | ✓ |
| HTTP/HTTPS responde **Server: Netlify** 200 | ✓ (smoke 2026-11-22) |
| SSL API `site.ssl=true` / Force HTTPS | em consolidação (cert pode ainda provisionar) |

## URLs

- Canônico: https://falpecasautomotivas.com  
- www → redireciona para apex (Netlify)  
- Fallback: https://fal-pecas-automotivas-efe.netlify.app  

## Pendente (#15-B / ops)

1. Confirmar cadeado verde estável (Force HTTPS no painel Netlify se ainda off)  
2. Env prod: `VITE_SITE_ORIGIN=https://falpecasautomotivas.com` + rebuild/deploy  
3. Supabase Auth: Site URL + Redirect URLs no domínio  
4. Merchant/Ads verify  

## Nota

Site linkado no Cursor = **efe** (`fal-pecas-automotivas-efe`), não o espelho `fal-pecas-automotivas` (fernando). Tráfego do domínio aponta para o projeto eFe.
