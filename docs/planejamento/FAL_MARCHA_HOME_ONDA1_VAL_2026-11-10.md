# FAL — VAL Onda 1 Home (código)

**Data:** 2026-11-10  
**Status:** código entregue no working tree — **aplicar SQL + publish = gate humano**  
**Spec:** [FAL_SPEC_HOME_EXPERIENCIA_COMPRA_2026-11-09.md](./FAL_SPEC_HOME_EXPERIENCIA_COMPRA_2026-11-09.md)

---

## Entregue

| Item | Evidência |
|------|-----------|
| Ordem complementar | `HomePage.tsx`: Destaques → Categorias → Garagem → Ofertas → Confiança |
| Remoção rail Suspensão/direção | Removido de `HomePage.tsx` |
| Bloco confiança | `HomeTrustSection.tsx` |
| Bloco garagem | `HomeGarageSection.tsx` |
| Vigência campanhas + imagem mobile | Migration `20261110140000_store_home_vigencia_featured_limit.sql` + admin + `listHomeBanners` |
| Qtd destaques admin | `store_home_settings.featured_display_limit` + aba Destaques |
| Placa: garagem após manual + `isPrimary` | `VehiclePlateSearch.tsx` |
| Spec + ops + pacotes 2–4 | Docs em `docs/planejamento/` |

## SQL a aplicar (humano)

1. `20261110120000_plate_lookup_cache.sql` (placa)  
2. `20261110140000_store_home_vigencia_featured_limit.sql` (Home Onda 1)  

Sem a migration Home, o admin de campanhas pode falhar ao selecionar colunas novas; a vitrine cai no fallback estático de banners.

## Smoke sugerido

- [ ] Home: ordem visual Campanhas → placa → Destaques → Categorias → Garagem → Ofertas (se houver) → Confiança  
- [ ] Admin: criar campanha com início/fim; fora do período some da loja  
- [ ] Admin: alterar quantidade de destaques; Home respeita o número  
- [ ] Placa falha → manual → confirmar → pergunta garagem  
- [ ] Mobile: banner usa `image_src_mobile` quando cadastrado  

## Testes automatizados

`npm test -- src/services/home/homeContentService.test.ts src/lib/homeSections.test.ts` — PASS  
`npx tsc -b` — PASS  
