# VAL — Layout · testes · aceite plano mestre (2026-11-27)

**Escopo:** admin veículos (CRUD Adaptive + hub Integrações + consultar/import) vs `FAL-UI-LAYOUT v1.6.4` + planos cadastro/caminho único/alinhamento wtbp.

## Layout / responsividade

| Check | Resultado | Evidência |
|-------|-----------|-----------|
| Adaptive `moduleKey=vehicles` | PASS | `AdminVehiclesPage.tsx` · FL1 |
| Hub Integrações sem Adaptive | PASS | chips/cards · smoke |
| Tokens `fal-*` / `ADMIN_CHIP` | PASS | páginas + hub |
| Lista mobile/desktop + scroll | PASS | `admin-vehicles-list-*` + `fal-admin-scroll` |
| Compact primary → cards (guia aberta) | **PASS (corrigido)** | CSS v1.6.4; antes faltava vehicles no bloco compact |
| Filtros tech densos (viewport grid) | PARTIAL | `sm/lg/xl` OK; sem `@container` / “Mais filtros” (FL14 produtos) |
| Select com `label` (não só placeholder) | PASS | lista + guia |
| Guia tech Selects | PASS | transmissão/tração/config/classe |

## Testes executados

| Suite | Resultado |
|-------|-----------|
| `adminVehiclesUx.smoke` (estendido) | PASS |
| `falUiLayoutAntiregress` (FL4+vehicles) | PASS |
| normalize fuel/transmission/traction · filterAdmin · enrich · adapters · diff · import · confirm · upsert.r2 · intelligence · source · normalizeMaster · fipeX · optionsIdentity | PASS |
| Totais desta marcha | **17 files · 112+ tests** (batch 1: 77; batch 2: 35) |
| `tsc --noEmit` | PASS |

## Aceite planos

| Plano / critério | Resultado |
|------------------|-----------|
| Alinhar wtbp (migs + Edge v14 + PVC 732 + docs §10) | PASS — VAL `FAL_MARCHA_ALINHAMENTO_MESTRE_WTBP_VAL_2026-11-27.md` |
| Caminho único (`applySelected…`; sem `adminApplyVehicleMasterImport`) | PASS |
| Cadastro F1–F3 attrs/filtros/fontes/hub incompletos | PASS (código + schema) |
| Cadastro F4 UI apply lote / F5 abas evidência / F6 aceitar enrich | PARTIAL — infra + hub; UI lote/evidência = backlog |
| Writers mapa §5 | PASS |

## Follow-up pós-auditoria (2026-11-27)

- `text-emerald-800` → `text-fal-success` (consultar + import)  
- Demanda: `Input` com `label` + `hint`  
- `Select` ganhou `hint`; Ano fim guia usa hint “Vazio = vigente”  
- Smoke cobre import + ausência de emerald  

## Follow-up consultar multi / parse / Demanda (2026-11-27)

VAL: [FAL_MARCHA_CONSULTAR_MULTI_PARSE_DEMANDA_VAL_2026-11-27.md](./FAL_MARCHA_CONSULTAR_MULTI_PARSE_DEMANDA_VAL_2026-11-27.md).

| Check | Resultado |
|-------|-----------|
| Hub copy multi-modelo + versões `/` | PASS |
| Consultar FIPE checkboxes N modelos | PASS |
| Prévia fan-out + apply separado | PASS |
| Demanda 1 termo | PASS |
| CTA Ver no cadastro `quality=review` | PASS | 

## Gaps residuais (não bloqueiam alinhamento)

1. Filtros veículos sempre expandidos (sem “Mais filtros” / `@container`) — polish FL14-like.  
2. UI `adminApplyVehicleImportBatch` + painéis evidência no guia (F4–F6).  
3. Attrs tech ainda NULL em massa (488) — ops/enrich, não layout.
