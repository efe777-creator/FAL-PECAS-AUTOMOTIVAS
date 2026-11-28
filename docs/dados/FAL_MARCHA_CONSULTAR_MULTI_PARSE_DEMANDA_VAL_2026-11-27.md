# VAL — Consultar multi · parse `/` · Demanda free-text · cadastro review

**Data:** 2026-11-27 · **Branch:** `dev` · **Auth:** eFe  
**Escopo:** Integrações → Consultar/Importar · parsers compartilhados · visibilidade no cadastro  
**Fora:** `adminApplyVehicleImportBatch` UI lote · PVC · HF · `db push` cego

## Problema (antes)

| Sintoma | Causa |
|---------|--------|
| FIPE só 1 modelo | `modelId` único + `Select` |
| `Comfortline / Highline` virava 1 VV | Sem fan-out; prefixo `MARCA/` engolia texto com espaço + `/` |
| `2.0 16V` poluía motor | Válvulas engolidas / coladas no motor |
| Demanda exigia montadora+modelo | Parser rígido token0=marca; 1 termo falhava |
| Import “não aparece” no cadastro | Modelos novos em `review` sem deep-link `?quality=review` |
| Prévia duplicava anos | Diff gerava 1 linha por ano×versão com a mesma vida |

## Entrega

### 1. FIPE multi-modelo (Consultar)

- `selectedModelIds: string[]` + checkboxes + filtro textual
- Anos por modelo (`modelId::yearCode`)
- `fipeSelectionToIntelligenceRows({ brandName, selections })`
- Validação: marca + ≥1 modelo + ≥1 ano

### 2. Fan-out de versões `/` e `|`

- Helper: `fal-pecas/src/lib/vehicles/splitVersionAlternatives.ts`
- Pipeline: `prepareVehicleMasterIntelligence` (antes do sanitize que comia `/`)
- Apply: `applySelectedMasterCandidates` re-fan-out por segurança
- Prefixo FIPE só compacto (`VW/`) — **sem** espaço (não engole `Comfortline / Highline`)

### 3. Motor = cilindrada; válvulas na versão

- `sanitizeEngine` / `peelValveSuffixFromEngineToken` (`2.016V` → motor `2.0`, versão `… 16V`)
- Trims FIPE: Comfortline, Highline, EXL, Premium…
- Fuel/`Aut.4p` fora da versão; `1.0 TSI` fica no motor
- Espelho Edge: `_shared/splitApiModelo.ts` + `normalizeVehicleMasterInput.ts`

### 4. Demanda — qualquer termo

- `collectDemandaIntelligenceFromCatalog` + `demandaTokensMatch`
- 1 token válido (`Gol`, `HB20`, `1.0`, `Comfortline`, `Volkswagen`)
- Match em montadora/modelo/motor/versão/combustível; ano opcional
- Casca / VV sem ano → vida do modelo
- Complemento FIPE: marcas do termo **ou** marcas já no mestre
- Copy UI: “não precisa montadora+modelo”

### 5. Cadastro / visibilidade

- Deep-link `/admin/veiculos?quality=review` (lista Adaptive)
- CTA **Ver no cadastro** pós-apply (Consultar + Importar)
- Diff: merge por identidade (maker|model|version|engine|fuel) fundindo anos

### 6. Identificação (INV)

- HB20 ≠ ambíguo só por HB20S (irmão = base+trim, não sufixo colado)
- Lookup continua `allowCanonicalUpsert: false`

## Fluxo ops (Integrações)

```
Hub Integrações
  ├─ Consultar e escolher → FIPE (N modelos) | Demanda | Arquivo
  │     → VehicleMasterConsultPreview (checkbox)
  │     → applySelectedMasterCandidates
  │     → Ver no cadastro (?quality=review)
  └─ Importar arquivo → mesma prévia/apply
```

Writer único massa: `applySelectedMasterCandidates` → `vehicleCanonicalUpsert` (mapa §5).

## Testes (evidência)

| Suite | Tip |
|-------|-----|
| `consultImportVersionSelection.test.ts` | multi + barra + campos |
| `integrationsMultiSlashApply.test.ts` | prévia → apply sem `/` colado |
| `demandaQuery.test.ts` | qualquer termo no mestre |
| `splitVersionAlternatives` · `splitApiModelo` · intelligence · sibling | PASS |
| `vehicleIdentityIntelligence.smoke` · `adminVehiclesUx.smoke` · antiregress writers | PASS |
| `tsc --noEmit` | PASS |

## Aceite manual

1. Integrações → Consultar → FIPE: marcar 2 modelos + anos → Montar prévia → N linhas  
2. Nome com `Comfortline / Highline` → 2 checkboxes (não uma versão com barra)  
3. Demanda `gol 1.0` sem “Volkswagen” → candidatos  
4. Apply → **Ver no cadastro** → filtro review mostra o modelo  
5. Import CSV com `versão = A / B` → 2 candidatos

## Docs relacionados

- [FAL_MARCHA_VEICULOS_INTEGRACOES_CONSULTA_VAL_2026-11-26.md](../planejamento/FAL_MARCHA_VEICULOS_INTEGRACOES_CONSULTA_VAL_2026-11-26.md) (hub/consultar base)
- [FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md](../arquitetura/FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md) §5 writers
- [FAL_RUNBOOK_QUALIDADE_MESTRE_VEICULAR_2026-11-21.md](./FAL_RUNBOOK_QUALIDADE_MESTRE_VEICULAR_2026-11-21.md)
- [FAL_MARCHA_VAL_LAYOUT_TESTES_MESTRE_2026-11-27.md](./FAL_MARCHA_VAL_LAYOUT_TESTES_MESTRE_2026-11-27.md)

## STOP

Sem Netlify nesta marcha. Sem `db push` massivo wtbp. Sem alterar pasta HF.
