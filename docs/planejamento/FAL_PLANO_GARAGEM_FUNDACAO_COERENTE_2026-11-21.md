# FAL — Plano operacional · Fundação coerente Minha Garagem

**Data:** 2026-11-21  
**Branch:** `dev`  
**Status:** **MARCHA CONCLUÍDA** (código + gates na `dev`)  
**VAL:** [FAL_MARCHA_GARAGEM_FUNDACAO_COERENTE_VAL_2026-11-21.md](./FAL_MARCHA_GARAGEM_FUNDACAO_COERENTE_VAL_2026-11-21.md)  
**Padrão UX:** [FAL_PADRAO_UX_MINHA_GARAGEM_2026-11-18.md](./FAL_PADRAO_UX_MINHA_GARAGEM_2026-11-18.md) (emenda 2026-11-21)  
**Auditoria:** [FAL_AUDITORIA_COMPARATIVA_IDENTIDADE_VISUAL_VEICULAR.md](./FAL_AUDITORIA_COMPARATIVA_IDENTIDADE_VISUAL_VEICULAR.md)

## Decisões

- Histórico cliente = **só peças compradas** na FAL (G7), 1 linha/item.
- Nav: Garagem | Histórico | Peças | Mais (sem Cuidados na primária).
- Visual 2D-first; sem CarImages; 3D opt-in.
- Sem `main`/deploy prod sem autorização.

## Fases · MARCHA

| # | Escopo | Status | Evidência |
|---|--------|--------|-----------|
| 0 | Emenda padrão + docs + `garageNav.test` | **DONE** | padrão UX + auditoria + testes nav |
| 1 | Nav / home / resumo | **DONE** | sem Cuidados; sem widget km; G7 últimas compras |
| 2 | Histórico só compras + vínculo cv_id | **DONE** | collapse G7; checkout `customerVehicleId`; migration COALESCE |
| 3 | Visual 2D engine | **DONE** | engine 2D-first; prefs auto→2d; XR oculto; dispose Three |
| 4 | Stock admin + VAL + antiregress | **DONE** | `/admin/imagens-stock`; VAL; tsc + vitest |

## Gates (revalidados na marcha do plano)

```bash
cd fal-pecas
pnpm exec tsc --noEmit
pnpm exec vitest run src/lib/garageNav.test.ts
pnpm exec vitest run src/services/garage/visualizationEngine.test.ts
pnpm exec vitest run src/services/garage/vehiclePartEventCollapse.test.ts
pnpm exec vitest run src/lib/visualViewerPrefs.test.ts
```

**Resultado:** PASS (18 testes nos gates acima). Sessão CP anterior: 133 garagem/layout + 88 placas.

## Commits na `dev`

| SHA | Nota |
|-----|------|
| `a6b442e` | feat fundação 2D + histórico compras |
| `651b537` | docs VAL push |
| `2cb7f1b` | test CP + `resolveViewerMode` 2D-first |

## Residual ops (fora do código)

1. Aplicar no Supabase (wtbp) `20261121200000_g7_coalesce_vehicle_id_from_snapshot.sql`.
2. Smoke compra com veículo ativo → Histórico.
3. Seed conteúdo stock 2D no admin (opcional).

**Não incluir:** merge `main`, deploy produção.
