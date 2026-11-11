# VAL — Onda 4 Integração placa/garagem/PDP

**Data:** 2026-11-11 · análise de código + alinhamento pós-Onda 1

| Fluxo | Mesmo motor PVC? | Evidência |
|-------|------------------|-----------|
| Placa → confirmação → CatalogPage.applyVehicleFilter | Sim — maker/model/year/engine/version na URL → searchCatalog | VehiclePlateSearch / CatalogPage |
| Garagem SavedVehiclesQuickPick | Sim — mesmos params | SavedVehiclesQuickPick |
| PDP apps | Display PVC only; não inventa fit | attachCompatibilitySummaries |
| Fallback placa falha | Fase manual VehicleSelector | VehiclePlateSearch |

**Smoke E2E browser:** pendente após deploy do front (RPC já no DB).

**PoC:** UI já diferencia mock vs apiplacas; não alterar nesta onda.
