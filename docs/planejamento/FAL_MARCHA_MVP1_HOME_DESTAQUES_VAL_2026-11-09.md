# VAL — MARCHA Pacote MVP-1 · Home ordem + destaques híbridos

**Data:** 2026-11-09  
**Auth:** eFe — `MARCHA` (Pacote MVP-1)  
**AJUSTE:** 029 (ordem Home) · 021/022-E2 (híbrido + teto admin)  
**Plano:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Deploy:** alterações de hoje — publicar só no **fim do dia**

---

## Entregas

| Item | Resultado |
|------|-----------|
| Ordem Home Campanhas → veículo → Destaques | PASS — `HomePage.tsx` |
| Slot placa = `VehicleSelector` (MVP-lite) | PASS — copy antecipa placa futura |
| `mergeFeaturedHybrid` + testes | PASS — 5/5 vitest |
| `listFeaturedProducts` completa vagas | PASS — não retorna só curados |
| Teto admin 12 → `ADMIN_FEATURED_MAX` (24) | PASS — `AdminHomeContentPage` |
| Limite Home via `HOME_FEATURED_LIMIT` (16) | PASS — sem hardcode 12 |

## Arquivos

- `fal-pecas/src/pages/Home/HomePage.tsx`
- `fal-pecas/src/lib/homeSections.ts`
- `fal-pecas/src/lib/homeSections.test.ts`
- `fal-pecas/src/services/products/productService.ts`
- `fal-pecas/src/pages/admin/home/AdminHomeContentPage.tsx`

## Limitações / próximo

- Quantidade de destaques ainda é constante no código (`HOME_FEATURED_LIMIT` / `ADMIN_FEATURED_MAX`), não setting no banco — Evolução / fatia seguinte.
- Fonte única de preço (022-E0/E1) e demais itens do Pacote MVP-1: seguintes MARCHAs.
- Sem publish produção nesta fatia.

## Teste executado

```text
vitest run src/lib/homeSections.test.ts → 5 passed
```

**Assinatura:** VAL MVP-1 Home/destaques PASS · 2026-11-09.
