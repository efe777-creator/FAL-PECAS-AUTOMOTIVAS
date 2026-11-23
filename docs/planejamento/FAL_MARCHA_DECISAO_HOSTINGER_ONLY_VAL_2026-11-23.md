# VAL — MARCHA decisão Hostinger only (docs)

**Data:** 2026-11-23 · **Branch:** `dev` · Sem MAIN  
**Auth:** eFe — `MARCHA`  
**Decisão:** [FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23.md](./FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23.md)

## Escopo

Documentar decisão de inativar Netlify como host e usar **somente Hostinger** para o storefront.  
**Fora:** cutover DNS, desligar sites, deploy, MAIN.

## Entrega

| Item | Status |
|------|--------|
| Doc decisão D1–D6 + checklist cutover | PASS |
| Domínio→Netlify 22/11 marcado HISTÓRICO | PASS |
| Checklist #15-B alinhado Hostinger-only | PASS |
| Ponteiro índice canônico | PASS |
| Antiregress `hostingerOnlyAntiregress.test.ts` | PASS |
| `.env.example` + `netlify.toml` LEGADO | PASS |
| DNS / Netlify / Hostinger painel alterados | **NÃO** (STOP) |

## Antiregress

`fal-pecas/src/lib/hostingerOnlyAntiregress.test.ts` — trava:

- decisão D1–D6 canônica  
- doc Netlify 22/11 supersedido  
- #15-B Hostinger-only  
- índice  
- `.env.example` sem default prod Netlify  
- `netlify.toml` marcado LEGADO  

## Próximo

`MARCHA HOSTINGER-ONLY CUTOVER` com OK eFe.
