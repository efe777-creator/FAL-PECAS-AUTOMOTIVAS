# FAL_AUDITORIA_GARAGEM_PLACA_V1

**Data:** 2026-11-11 · Somente leitura

---

## 1. Garagem

| Tema | Achado | Label |
|------|--------|-------|
| Persistência | `customer_vehicles` (FK customer, version_id, maker/model, year, engine, nickname, is_primary) | FATO |
| Serviços | `customerVehicleService.ts`, `pendingGarage.ts` | FATO |
| UI | AccountVehiclesPage, HomeGarageSection, HomeVehiclesPanel, SavedVehiclesQuickPick | FATO |
| Login | Obrigatório para **salvar**; busca/filtro funciona sem login | FATO |
| Pending anônimo | `sessionStorage` `fal_pending_garage_vehicle` → flush pós-login | FATO |
| Contexto catálogo | Aplica **mesmos** query params maker/model/year/engine/version | FATO |
| Mesmo mestre? | Resolve `version_id` via VV canônico; sem VV não salva | FATO |
| Compatibilidade | Não tem motor próprio — reusa `search_products`/PVC após filtrar URL | FATO |

**RECOMENDAÇÃO:** manter save opcional; não criar segundo cadastro.

---

## 2. Busca por placa

| Tema | Achado | Label |
|------|--------|-------|
| Edge | `supabase/functions/plate-lookup` | FATO |
| Provider | `apiplacas` se token; senão `mock` | FATO |
| Cache | `cached_plates` TTL 7d | FATO (migration repo) |
| Upsert | `vehicleCanonicalUpsert(..., source:'plate')` no mestre | FATO |
| UI | VehiclePlateSearch → confirmação → VehicleSelector editável | FATO |
| Fallback | Fase `manual` se falha/incompleto | FATO |
| PVC | Placa **não** consulta PVC; só identifica VV; catálogo depois usa PVC | FATO |
| fuel/transmission | Retornam no payload; **não** entram no VehicleFilter | FATO |
| PoC vs real | Banner mock na UI; produção com token = real | Código FATO; token em prod **NÃO VERIFICADO** nesta sessão |

**Docs VAL:** `fal-pecas/docs/VAL-placa-filtros-veiculo.md`, specs em `docs/planejamento/FAL_SPEC_BUSCA_POR_PLACA_*` — histórico; revalidar operacionalmente.

---

## 3. Problemas

| ID | Descrição | P |
|----|-----------|---|
| GPL-01 | Após placa, mesmos bugs de ano/motor da busca estruturada | P0 (depende APP/VEI) |
| GPL-02 | fuel/transmissão descartados | P2 |
| GPL-03 | Confirmar provider real em produção | P1 ops |
| GPL-04 | Garantir copy nunca trata mock como consulta real | P1 |

## 4. Preservar

Upsert canônico na placa, confirmação humana, fallback manual, pending garage, SavedVehiclesQuickPick no catálogo.
