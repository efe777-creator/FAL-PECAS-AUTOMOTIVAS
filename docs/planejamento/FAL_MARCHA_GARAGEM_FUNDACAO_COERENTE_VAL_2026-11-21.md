# FAL — MARCHA / VAL · Fundação coerente Minha Garagem

**Data:** 2026-11-21 · **Branch:** `dev`  
**Plano:** [FAL_PLANO_GARAGEM_FUNDACAO_COERENTE_2026-11-21.md](./FAL_PLANO_GARAGEM_FUNDACAO_COERENTE_2026-11-21.md)  
**Padrão UX:** emendado 2026-11-21 (nav sem Cuidados; Histórico = compras)

## Gates automação

| Comando | Resultado |
|---------|-----------|
| `pnpm exec tsc --noEmit` | **PASS** |
| `pnpm exec vitest run src/lib/garageNav.test.ts` | **PASS** (5) |
| `pnpm exec vitest run src/services/garage/visualizationEngine.test.ts` | **PASS** (8) |
| `pnpm exec vitest run src/services/garage/vehiclePartEventCollapse.test.ts` | **PASS** (2) |

## Entregue nesta marcha

- Nav: Garagem \| Histórico \| Peças \| Mais  
- Home sem widget cuidados/km; últimas peças compradas (G7)  
- Histórico UI = só compras colapsadas; empty + CTA Peças  
- Checkout grava `customerVehicleId` do ativo; migration G7 COALESCE snapshot  
- Visual 2D-first; XR oculto; smoke GLB não conta; dispose Three no unmount  
- Admin `/admin/imagens-stock`  
- Docs: auditoria, plano, padrão UX, nota CarImages no Consolida UX  

## Smoke manual (checklist)

1. `/conta/veiculos` — hero 2D; sem “próximos cuidados”; nav nova.  
2. Histórico — só compras; empty fala compra FAL.  
3. Peças — “que cabem”.  
4. Mais → Visualização — imagem 2D; 3D só com GLB real.  
5. Compra com veículo ativo → linha no Histórico após status pago (aplicar migration no projeto Supabase).  

## Resultado

**Automação: PASS.**  
**Commit:** `a6b442e` · **Push:** `origin/dev` (2026-11-21).  

Smoke compra→histórico depende de aplicar migration `20261121200000_g7_coalesce_vehicle_id_from_snapshot.sql` no ambiente wtbp e pedido real.
