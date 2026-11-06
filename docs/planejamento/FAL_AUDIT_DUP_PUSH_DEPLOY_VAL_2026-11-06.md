# VAL — Auditoria commits / push / deploy + duplicidades

**Data:** 2026-11-06  
**Auth:** eFe

---

## Git / deploy (verificado)

| Item | Resultado |
|------|-----------|
| `main` = `origin/main` | **PASS** (`b7cd113`) |
| PR #73 (Ondas 0–4) | MERGED |
| PR #74 (fix categoryHref) | MERGED |
| Netlify production | **ready** (`6aecd125…`) |

---

## Duplicidades

| Achado | Ação |
|--------|------|
| Cascata categoria reimplementada no form produto | **Corrigido** → `CategoryCascadeSelects` |
| `search_document` montado no client + rebuild SQL | **Reduzido** → placeholder + RPC canônico |
| `pnpm-lock` + `package-lock` | **gitignore** pnpm (Netlify = npm) |
| `sitemap.xml` versionado + gerado no build | **Removido do git** + gitignore (gera no build) |
| packing espelhado src ↔ Edge | **MANTER** (comentário espelho; Deno) |
| caches payment/searchPrep | **OK** (domínios distintos) |
| banners estáticos fallback | **OK** (offline) |
| mapas status pedido ×3 | **CONSOLIDAR** depois (gate copy) |

---

## STOP

Push deste pacote de limpeza → merge → redeploy.

**Assinatura:** AUDIT dup/push/deploy 2026-11-06.
