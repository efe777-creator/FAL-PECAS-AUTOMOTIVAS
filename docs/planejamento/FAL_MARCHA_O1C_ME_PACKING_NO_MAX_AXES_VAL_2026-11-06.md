# VAL — O1-C volumes ME sem max-eixos silencioso

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** Volumes ME = max eixos + peso → consolidar com templates

## Entrega

| Peça | Mudança |
|------|---------|
| `resolvePackingStrategy` | `box_template` \| `per_item` \| `packing_failed` (src + Edge `_shared`) |
| `quote-shipping` ME | Com caixas ativas e nenhuma cabe → **422 packing_failed** (não inventa envelope) |
| Sem templates | `per_item` (produtos individuais na API); volumes sem rótulo `max_axes` |
| Testes | Vitest estratégia + pick |

## Critérios

- [x] `tsc --noEmit` OK  
- [x] Vitest packing OK  
- [x] Inventário → **MANTER**  
- [x] **Redeploy** Edge `quote-shipping` — PASS 2026-11-06 (wtbp, `--yes`)

## Gate humano

Fechado (deploy produção wtbp).
