# FAL — Mestre de veículos · Integrações (híbrido assertivo)

**Data:** 2026-11-21  
**Branch:** `dev` (somente)  
**Status:** M1–M3 implantados (hub + seed fipeX → CSV + stats + runbook)  
**Refs:** [PLANO 0](./FAL_PLANO0_FUNDACAO_CADASTRO_PLACA_2026-11-17.md) · [PLANO 2A](./FAL_PLANO2A_VEHICLE_IDENTITY_2026.md) · [INV pós-Onda1](./FAL_INV_EXPANSAO_POS_ONDA1_V1.md) · [Notes #6](./FAL_ANALISE_ERROS_NOTES_211136_REF_2026-11-21.md) · [Pagamentos hub](./FAL_PLANO_MESTRE_PAGAMENTOS_INTEGRACOES_2026-11-09.md)

---

## Princípio de assertividade

Cada afirmação tem evidência em **doc** e/ou **código**. DONE não se reimplementa. GAP vira marcha. Conflito com PLANO 0 / PVC é **bloqueado**.

## Matriz cruzada — docs × implantação × este plano

| Tema | Doc canônico | Código / evidência | Status | Ação |
|------|--------------|-------------------|--------|------|
| Híbrido placa + manual | PLANO 0 | `VehiclePlateSearch`, `VehiclePlateConfirmation`, `VehicleSelector` | **DONE** | Não redesenhar |
| Identificação ≠ PVC | PLANO 0 §5.4 | `adminApplyVehicleMasterImport` “sem criar PVC”; copy em `AdminVehiclesPage` | **DONE** | Hub reforça; seed herda |
| Cache placa | PLANO 0 | Edge `cached_plates` | **DONE** | Runbook |
| Assert placa / band | Notes #6 | `assertPlateAgainstCatalog`, `assistPlateIdentity` | **DONE** (+ ops redeploy) | Checklist ops; não reabrir |
| Garagem / activeFilter | Garagem fundação | `GarageContext` | **DONE** | Fora |
| Identidade 2A | PLANO 2A | Roadmap | **NÃO ESTE PLANO** | Backlog |
| INV / FIPE fonte | INV item 5 | Sem seed fipeX | **GAP** | Seed → mestre (não INV UI) |
| Import CSV mestre | — | `AdminVehicleMasterImportPage` + service | **DONE** | **Único writer** massa |
| Nav Importar | — | Link na página; ausente no menu | **GAP UX** | Hub na nav |
| Hub Integrações | — | `/admin/veiculos/integracoes` | **GAP→M1** | Este plano |
| Seed fipeX → CSV | — | `fipeXToFalVehicleMasterCsv` | **GAP→M2** | Este plano |
| Adaptive CRUD veículos | Padrão Adaptive | CRUD clássico | **FORA** | Não misturar |
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

### Seed fipeX → mestre

1. Obter dump/CSV fipeX (carros; licença CC0 do projeto).  
2. Admin → Veículos → Integrações → Seed fipeX → selecionar arquivo.  
3. Baixar CSV FAL gerado.  
4. Abrir Enriquecer mestre (CSV) → preview → apply (idempotente, sem PVC).  
5. Conferir contadores no hub e seletor da loja.

### Pós-seed (VAL seletor)

- Busca por montadoras prioritárias (Fiat, VW, Chevrolet, Ford, Renault, Toyota, Hyundai).  
- Placa continua assertindo só contra catálogo; seed não cria aplicações.

## Backlog (não implementar aqui)

- `yearFactory` / `yearModel` no snapshot  
- `fipeCode` informativo (nunca predicado de peça)  
- AdaptiveWorkspace no CRUD veículos  
- Parallelum refresh  
- VIN 2A  

## Fora de escopo

Trocar ApiPlacas · PVC em massa · visual 2B/3D · MAIN

**Assinatura:** Spec Integrações mestre veículos · 2026-11-21.
