# FAL — Plano operacional · Fundação coerente Minha Garagem

**Data:** 2026-11-21  
**Branch:** `dev`  
**Status:** EM IMPLEMENTAÇÃO  
**Padrão UX:** [FAL_PADRAO_UX_MINHA_GARAGEM_2026-11-18.md](./FAL_PADRAO_UX_MINHA_GARAGEM_2026-11-18.md) (emenda 2026-11-21)  
**Auditoria:** [FAL_AUDITORIA_COMPARATIVA_IDENTIDADE_VISUAL_VEICULAR.md](./FAL_AUDITORIA_COMPARATIVA_IDENTIDADE_VISUAL_VEICULAR.md)

## Decisões

- Histórico cliente = **só peças compradas** na FAL (G7), 1 linha/item.
- Nav: Garagem | Histórico | Peças | Mais (sem Cuidados na primária).
- Visual 2D-first; sem CarImages; 3D opt-in.
- Sem `main`/deploy prod sem autorização.

## Fases

0. Emenda padrão + docs + `garageNav.test`  
1. Nav / home / resumo  
2. Histórico só compras + vínculo cv_id  
3. Visual 2D engine  
4. Stock admin + VAL + antiregress  

## Gates

```bash
cd fal-pecas
pnpm exec tsc --noEmit
pnpm exec vitest run src/lib/garageNav.test.ts
pnpm exec vitest run src/services/garage/visualizationEngine.test.ts
```
