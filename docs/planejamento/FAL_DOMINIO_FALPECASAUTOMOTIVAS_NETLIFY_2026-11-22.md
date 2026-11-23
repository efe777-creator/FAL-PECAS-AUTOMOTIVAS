# Domínio falpecasautomotivas.com → Netlify (Cursor / eFe)

**Data:** 2026-11-22 · **Branch:** `dev`  
**Status:** **HISTÓRICO / SUPERSEDIDO** (2026-11-23)  
**Canônico atual:** [FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23.md](./FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23.md)

> **Não usar como autoridade de deploy.** Fluxo Netlify-as-host encerrado por decisão eFe.  
> Cutover Hostinger-only = MARCHA separada (checklist no doc de decisão).

---

## Registro histórico (fato até 2026-11-22)

**Site Netlify:** `fal-pecas-automotivas-efe` (`79994809-2fb1-4faf-bce5-4feac9a7d3a3`)  
**Registrar:** Hostinger

| Passo | Status (à época) |
|-------|------------------|
| Domínio ativo no portfolio Hostinger | ✓ |
| Netlify `custom_domain` = `falpecasautomotivas.com` | ✓ |
| Alias `www.falpecasautomotivas.com` | ✓ |
| DNS `@` ALIAS → `fal-pecas-automotivas-efe.netlify.app` | ✓ |
| DNS `www` CNAME → `fal-pecas-automotivas-efe.netlify.app` | ✓ |
| DNS público `www` → Netlify | ✓ (CNAME) |
| DNS apex ALIAS → Netlify | ✓ |
| HTTP/HTTPS responde **Server: Netlify** 200 | ✓ (smoke 2026-11-22) |
| SSL API `site.ssl=true` / Force HTTPS | em consolidação (à época) |

## URLs (legado)

- Canônico (à época): https://falpecasautomotivas.com  
- www → redirecionava para apex (Netlify)  
- Fallback: https://fal-pecas-automotivas-efe.netlify.app  

## Nota histórica

Site linkado no Cursor = **efe** (`fal-pecas-automotivas-efe`), não o espelho `fal-pecas-automotivas` (fernando). Tráfego do domínio apontava para o projeto eFe via Netlify.
