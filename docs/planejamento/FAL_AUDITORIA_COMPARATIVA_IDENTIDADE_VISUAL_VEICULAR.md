# FAL — Auditoria comparativa · Identidade e visualização veicular

**Data:** 2026-11-21 · **Branch lida:** `dev` · **Status:** RELATÓRIO  
**Natureza:** read-only na origem; implementação segue [FAL_PLANO_GARAGEM_FUNDACAO_COERENTE_2026-11-21.md](./FAL_PLANO_GARAGEM_FUNDACAO_COERENTE_2026-11-21.md)

## Resumo executivo

A FAL já possui placa (APIPLACAS / `plate-lookup`), filtros/PVC, identity 2A, garagem, hero 2D (pessoal → `vehicle_stock_images` → placeholder), engine 2D/procedural/GLB/XR e admin GLB. **CarImages cancelada.** NotebookLM (CarAPI, VehicleViewer.js, model-viewer) **não adotar**.

**Diretriz produto:** 2D prioritário; Histórico = só compras FAL no veículo; Cuidados/manutenção/km fora do caminho feliz até parceiros.

## Identificação (AS-IS — manter)

- Edge `plate-lookup` + `APIPLACAS_TOKEN`; cliente `lookupPlate`.
- Manual: `VehicleSelector` + árvore catálogo.
- Save: `addSavedVehicle` → RPC `create_customer_vehicle_with_identity`.
- Ativo loja: `GarageContext`.

## Imagens 2D

| Fonte | Estado |
|-------|--------|
| Foto pessoal | Ativa |
| `vehicle_stock_images` | Ativa (cobertura depende seed) |
| Placeholder | Ativo |
| CarImages | **Cancelada** |

## Motor visual

`resolveVisualizationSource`: em `auto` sem GLB caía em **procedural** — corrigir para **2d**. XR ocultar no cliente nesta onda.

## Histórico × compras (gaps)

Timeline misturava `vehicle_events` + G7; empty pedia manutenção; `customer_vehicle_id` null → compra invisível; `bought`+`associated` duplicavam UI. Plano: UI só G7 colapsado + vínculo cv_id.

## NotebookLM

Aproveitar só conceitos (cascata, desacoplar ID×visual). Descartar segunda API placa, ASSET_REGISTRY estático, VehicleViewer.js.

## Decisões eFe

Manter placa; stock local; Histórico=compras; emendar padrão UX; só `dev`.
