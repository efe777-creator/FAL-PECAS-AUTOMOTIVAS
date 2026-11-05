# VAL — MARCHA Onda 2 · Sitemap dinâmico de produtos

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Runtime:** wtbp + Netlify loja

---

## Escopo

`public/sitemap.xml` gerado no build com rotas estáticas + `/produto/:slug` published; `npm run build` chama `scripts/generate-sitemap.mjs`.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Script `generate-sitemap.mjs` (REST anon ou CLI fallback) | **PASS** |
| 2 | Geração local → **103 URLs** (3 estáticas + 100 produtos) | **PASS** |
| 3 | `build` inclui `node scripts/generate-sitemap.mjs` | **PASS** |
| 4 | `netlify.toml` headers Content-Type sitemap | **PASS** |
| 5 | Unit `sitemapXml.test.ts` | **PASS** |
| 6 | `robots.txt` já aponta `/sitemap.xml` | **PASS** (P1) |

---

## STOP

**Onda 2 busca/SEO — pacote fechado** (P1, facetas, favoritos, slug, path, sugestões RPC, sitemap).

Próximo plano: **Onda 3** (home comercial) · gate **D-FRETE C** (humano) · ME print humano.

**Assinatura:** VAL Onda 2 sitemap dinâmico PASS 2026-11-05.
