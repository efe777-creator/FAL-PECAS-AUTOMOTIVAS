# FAL — Mestre de veículos · Integrações (híbrido assertivo)

**Data:** 2026-11-21  
**Branch:** `dev` (somente)  
**Status:** M1–M3 hub/seed DONE · **Onda mestre inteligente DONE** (vida de linha + sync + assert residual + pórtico)  
**Refs:** [Mapa veículo (caminhos·relações·layout)](../arquitetura/FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md) · [PLANO 0](./FAL_PLANO0_FUNDACAO_CADASTRO_PLACA_2026-11-17.md) · [PLANO 2A](./FAL_PLANO2A_VEHICLE_IDENTITY_2026.md) · [INV pós-Onda1](./FAL_INV_EXPANSAO_POS_ONDA1_V1.md) · [Notes #6](./FAL_ANALISE_ERROS_NOTES_211136_REF_2026-11-21.md) · [Pagamentos hub](./FAL_PLANO_MESTRE_PAGAMENTOS_INTEGRACOES_2026-11-09.md) · [Layout v1.5](./FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md)

---

## Princípio de assertividade

Cada afirmação tem evidência em **doc** e/ou **código**. DONE não se reimplementa. GAP vira marcha. Conflito com PLANO 0 / PVC / [mapa](../arquitetura/FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md) é **bloqueado**.

## Matriz cruzada — docs × implantação × este plano

| Tema | Doc canônico | Código / evidência | Status | Ação |
|------|--------------|-------------------|--------|------|
| Caminhos / writers / anos | [Mapa](../arquitetura/FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md) | confirm-upsert; lookup RO | **DONE** | Não recopiar |
| Híbrido placa + manual | PLANO 0 | `VehiclePlateSearch`, `VehiclePlateConfirmation`, `VehicleSelector` | **DONE** | Não redesenhar |
| Identificação ≠ PVC | PLANO 0 §5.4 · Fontes Verdade | import “sem PVC”; seletor sem PVC | **DONE** | Hub reforça |
| Cache placa | PLANO 0 | Edge `cached_plates` | **DONE** | Runbook |
| Assert placa / band | Notes #6 | `assertPlateAgainstCatalog`, `assistPlateIdentity` | **DONE** | Não reabrir |
| Garagem / activeFilter | Garagem fundação | `GarageContext` | **DONE** | Fora |
| Identidade 2A | PLANO 2A | Roadmap | **NÃO ESTE PLANO** | Backlog |
| Seed fipeX → mestre | Este plano | `fipeXToFal*` + import / sync hub | **DONE** (fixture+thin; dump completo = ops) | Sync dump quando houver |
| Import CSV mestre | Este plano | `adminApplyVehicleMasterImport` | **DONE** | **Único writer** massa |
| Hub Integrações | Este plano · Layout chips | `/admin/veiculos/integracoes` | **DONE** | — |
| Adaptive CRUD veículos | Layout v1.5 | CRUD clássico | **FORA** | Não misturar |
| Filtro peças por FIPE | — | Catálogo = PVC | **BLOQUEADO** | Nunca |
| Copy “100% compatível” | — | Selos PVC | **BLOQUEADO** | Nunca |

## Decisões travadas

1. Não redesenhar híbrido da loja.  
2. Não segundo `adminApply*` — fipeX só produz CSV para o import atual.  
3. Não gravar PVC no seed/import.  
4. Não usar `codigo_fipe` como predicado de catálogo.  
5. Hub visual = padrão Pagamentos (chips + cards), não AdaptiveWorkspace.  
6. Branch só `dev`.

## Spec hub — `/admin/veiculos/integracoes`

Papel: mesma família de Veículos (`CATALOG_OPS` via prefixo). Apply CSV continua `administrador`/`gerente` na página de import.

| Card | Destino | Nota |
|------|---------|------|
| Enriquecer mestre (CSV) | `/admin/veiculos/importar-mestre` | Mesmo preview/apply; copy “sem PVC” |
| Seed fipeX | Upload dump → gera/baixa CSV FAL | Sem API no browser; apply só no import |
| Cadastro manual | `/admin/veiculos` | CRUD existente |

Chips: Import disponível · Seed pronto · contagens mestre (makers / models / VV active).

Deep-link `/admin/veiculos/importar-mestre` e botão na página Veículos **permanecem**.

## Marchas

| ID | Entrega |
|----|---------|
| M1 | Este doc + hub 3 cards + nav/router/ícone/breadcrumb |
| M2 | Normalizador fipeX → CSV FAL + testes + fixture |
| M3 | Contadores + Seed no hub + runbook + checklist redeploy `plate-lookup` |

## Aceite assertivo

- [x] Matriz bate com arquivos citados  
- [x] Diff loja placa/confirmação/PVC vazio (links hub/import apenas)  
- [x] Único writer massa = `adminApplyVehicleMasterImport`  
- [x] Zero insert PVC no seed/import (`fipeXToFal*` só emite CSV)  
- [x] Nav tem Integrações; import ainda abre  
- [x] `tsc` + `adminNavConfig` + `fipeXToFalVehicleMasterCsv` PASS  


## Bloqueios (rejeitar PR)

Filtro/catálogo por FIPE · segundo writer · PVC no seed · Adaptive CRUD neste PR · MAIN

## Runbook ops

### Redeploy Edge `plate-lookup` (Notes #6 residual)

**DONE** 2026-11-21 — `npx supabase functions deploy plate-lookup --yes` (projeto `wtbpwuiayednvlhvuhbh`). Edge passa a expor `confidenceBand` na resposta.

Validação automatizada: `hybridVehicleIntegration.test.ts` (seed → assert → assist → re-assert). Smoke manual: placa com família ambígua (Kwid) e faixa A–D na conferência.

### Sync inteligente / seed fipeX → mestre

1. Obter dump/CSV fipeX (carros; licença CC0).  
2. Admin → Veículos → Integrações → **Sincronizar mestre** (admin/gerente) → selecionar arquivo.  
3. Intelligence exige ano, sanitiza, upsert canônico + `merge_model_production_years` (**zero PVC**).  
4. Alternativa: import CSV clássico em Enriquecer mestre.  
5. Conferir chips (contadores + última sync) e seletor da loja.

### Job auto (pórtico)

```bash
# Secret no projeto: VEHICLE_MASTER_SYNC_SECRET
# Cron semanal (ops) → POST Edge vehicle-master-sync
# Header: x-fal-sync-secret: <secret>
# Body: { "csvText": "<dump>", "dryRun": true }
npx supabase functions deploy vehicle-master-sync --yes
```

Apply completo preferencial no hub; Edge valida secret + saúde do mestre. API π = `VehicleMasterSource` `paid_api_future` (stub).

### Pós-seed (VAL seletor)

- Busca por montadoras prioritárias (Fiat, VW, Chevrolet, Ford, Renault, Toyota, Hyundai).  
- Placa continua assertindo só contra catálogo; seed não cria aplicações.

## Camadas de ano (auditoria 2026-11-21)

| Camada | Campo | Papel | Regra |
|--------|-------|-------|--------|
| Peça | PVC `year_start`/`year_end` | Fit catálogo | Fonte de verdade — não mexer no match |
| Config/placa | `vehicle_versions.year` | Snapshot + chave natural | Mantém |
| Instância | `customer_vehicles.year` | Garagem | Fora do mestre |
| Vida de linha | `models.production_year_start/end` | “Existiu de X a Y” | Metadado; **nunca** predicado de `search_products` |

Riscos residuais tratados na onda inteligente: confirm hard-block · reconcile exact-model · sync apply via `vehicleMasterIntelligence` · pórtico `VehicleMasterSource`.

## Onda mestre inteligente (não reabre Notes #6)

- Writer único: `vehicleCanonicalUpsert` + `merge_model_production_years`.  
- Sync hub: preview → apply canônico (**zero PVC**).  
- Assert loja: endurecer confirm/reconcile; band/família #6 permanece.  
- API π futura: só interface fonte plugável.

## Backlog

- ~~`yearFactory` / `yearModel` no snapshot~~ → **DONE** Fase 1 inteligência (`yearModel` + `yearFabrication`; filtro = ano-modelo)  
- Lookup placa **read-only** (sem upsert Edge) → **DONE** Fase 1 (writer = confirm)  
- ~~`fipeCode` informativo~~ → **DONE** Fase 2 (flags `PLATE_FIPE_ASSIST` / `PLATE_ENGINE_STEPUP`; nunca predicado PVC)  
- Vida de linha → **134/134** ativos com vida; makers ocos **0** (dev 2026-11-21)  
- Anos seletor = VV+vida (PVC fora) → [mapa](../arquitetura/FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md)

**Backlog residual (não reabre este plano)**  
- AdaptiveWorkspace no CRUD veículos  
- Parallelum / API paga  
- VIN 2A  
- Dump fipeX completo (ops) · VAL placa ApiPlacas ao vivo

## Fora de escopo

Trocar ApiPlacas · PVC em massa · visual 2B/3D · MAIN · predicado FIPE

**Assinatura:** Spec Integrações mestre + onda inteligente · 2026-11-21.
