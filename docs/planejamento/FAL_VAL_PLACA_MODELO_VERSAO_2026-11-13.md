# VAL — Identificação por placa (modelo / versão / motor / ano)

**Data:** 2026-11-13  
**Escopo:** plano *Placa modelo versão* · wtbp  
**Vitest plates:** 54+ PASS (incl. reconcile shorter-base, assertModelClean, plateResultToFilter)

## Matriz PLA (mascarada)

| ID | Sufixo | Esperado (limpo) | Evidência | Resultado |
|----|--------|------------------|-----------|-----------|
| PLA-01 | **29** | Renault · **Kwid** · Intense · 1.0 | split + reconcile; cache/mestre limpos | **PASS** |
| PLA-02 | **37** | Hyundai · **HB20** · Unique · 1.0 | auditoria; versão em campo próprio | **PASS** |
| PLA-03 | **99** | Fiat · **Argo** · Trekking · 1.8 | split `Argo Trekking`; modelo composto removido do mestre | **PASS** |
| PLA-04 | **06** | Ford · **Fiesta** · motor 1.0 · fuel FLEX só info | `Fiesta Flex` → Fiesta; fuel fora do VehicleFilter | **PASS** |
| PLA-05 | **02** | Fiat · **Palio** · Fire Economy · 1.0 | allowlist Fire/Economy; mestre limpo | **PASS** |
| PLA-06 | **24** | Hyundai · **Tucson** · GLSB · 2.0 | Tucson recriado limpo; GLSB em versão | **PASS** |
| PLA-07 | **85** | VW · **Polo** · HL AB | split Polo HL AB | **PASS** |
| PLA-08 | **23** | Yamaha · **XTZ150** · Crosser S | trim multi-token; modelo base | **PASS** |

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Modelo exibido/filtrado **nunca** contém motor/versão reconhecíveis | **PASS** (`isModelNameClean` + cleanup `remaining_dirty_models=0`) |
| Versão/motor em campos próprios ou **Não informado** sem evidência no mestre | **PASS** (UX + reconcile fallback `""`) |
| FLEX/fuel **não** entra no `VehicleFilter` / RPC | **PASS** (teste plateResultToFilter) |
| `pickClosest` não promove `Kwid Intens 10MT` a partir de `Kwid` | **PASS** (vitest) |
| Cache sujo purged / re-split no Edge | **PASS** (`assertModelClean` em plate-lookup + upsert) |

## Deploy

| Artefato | Ação | Evidência |
|----------|------|-----------|
| Edge `plate-lookup` | deploy wtbp `--yes` | dashboard functions wtbp · assets split/upsert/assert |
| Front preview | `netlify deploy --alias=placa-modelo` | https://placa-modelo--fal-pecas-automotivas-efe.netlify.app |
| Build/deploy id | draft | `6af7169715e2a6e61a9835e9` |
| Prod front | **não** | aguarda aval explícito `--prod` |

## Assinatura

Código + mestre limpos (`remaining_dirty=0`) · Vitest plates 55 PASS · matriz PLA ≥6 PASS · Edge + preview · 2026-11-13
