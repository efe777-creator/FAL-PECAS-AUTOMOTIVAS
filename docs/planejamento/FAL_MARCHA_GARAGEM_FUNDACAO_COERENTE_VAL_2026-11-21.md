# FAL — MARCHA / VAL · Fundação coerente Minha Garagem

**Data:** 2026-11-21 · **Branch:** `dev`  
**Plano:** [FAL_PLANO_GARAGEM_FUNDACAO_COERENTE_2026-11-21.md](./FAL_PLANO_GARAGEM_FUNDACAO_COERENTE_2026-11-21.md)  
**Padrão UX:** emendado 2026-11-21 (nav sem Cuidados; Histórico = compras)

## Gates automação (sessão CP)

| Pacote | Resultado |
|--------|-----------|
| `pnpm exec tsc --noEmit` | **PASS** |
| Garagem / visual / identity / layout (32 files) | **133 PASS** |
| Placas + admin visual asset | **88 PASS** |
| Correção: `resolveViewerMode` auto→2d | **PASS** (`visualViewerPrefs.test`) |

## Entregue

- Nav: Garagem \| Histórico \| Peças \| Mais  
- Home sem widget cuidados/km; últimas peças compradas (G7)  
- Histórico UI = só compras colapsadas; empty + CTA Peças  
- Checkout grava `customerVehicleId` do ativo; migration G7 COALESCE snapshot  
- Visual 2D-first; XR oculto; smoke GLB não conta; dispose Three no unmount  
- `resolveViewerMode('auto')` → **2d** (alinhado ao engine)  
- Admin `/admin/imagens-stock`  
- Docs: auditoria, plano, padrão UX, nota CarImages no Consolida UX  

## Smoke manual (checklist)

1. `/conta/veiculos` — hero 2D; sem “próximos cuidados”; nav nova.  
2. Histórico — só compras; empty fala compra FAL.  
3. Peças — “que cabem”.  
4. Mais → Visualização — imagem 2D; 3D só com GLB real.  
5. Compra com veículo ativo → linha no Histórico após status pago (aplicar migration no projeto Supabase).  

## Resultado

**Automação sessão CP: PASS** (tsc + 133 garagem/layout + 88 placas).  
**Plano:** **MARCHA CONCLUÍDA** — fases 0–4 DONE em `FAL_PLANO_GARAGEM_FUNDACAO_COERENTE_2026-11-21.md`.  
**Commits:** `a6b442e` · `651b537` · `2cb7f1b` · *este* (fecho plano).  
**Push:** `origin/dev`.

Smoke compra→histórico: aplicar migration `20261121200000_g7_coalesce_vehicle_id_from_snapshot.sql` no wtbp.
