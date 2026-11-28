# VAL — MARCHA: Integrações veículos · consultar/atualizar seletivo

**Data:** 2026-11-26 · **Auth:** eFe · `marcha` = `dev` → `main` + Hostinger + Edge FIPE

## Escopo

| Peça | Tip |
|------|-----|
| Hub Integrações | Chips/cards FAL + fila única **Para revisar** |
| Consultar e escolher | `/admin/veiculos/consultar-mestre` — Arquivo · FIPE · Demanda |
| Prévia | Checkbox + edição (modelo/versão/motor/combustível/anos); apply só marcados |
| Import CSV | Mesma prévia seletiva (sem apply cego) |
| Edge | `fipe-catalog-lookup` em `wtbpwuiayednvlhvuhbh` · secret `FIPE_API_TOKEN` |
| Domínio | Sem PVC · sem predicado `codigo_fipe` |

## Git

| Peça | Tip |
|------|-----|
| `origin/dev` / `origin/main` | `0388763` (FF merge) |
| Escopo paths | hub · consult page · preview · diff/consult services · Edge FIPE · smokes · VAL |

## Smoke / testes (pré-deploy)

| Check | Status |
|-------|--------|
| Vitest hub/consult/diff/fuel/nav/assertiveness/layout | **PASS** · 69 |
| `pnpm run build` (`tsc -b` + vite) | **PASS** |
| Chunks consult/hub no dist | **PASS** · `AdminVehicleMasterConsultPage-DswshLng` · `AdminVehicleIntegrationsHubPage-CkYeYGYd` |

## Deploy

| Peça | Fato |
|------|------|
| Host | `falpecasautomotivas.com` · `hosting_deploy-static-website` |
| Archive | `dist_20261126_212047.zip` (removed pós-upload) |
| Edge FIPE | Deployed ACTIVE + `FIPE_API_TOKEN` set |
| Tip live | `index-CXCg7fhR.js` · HTTP 200 |

## Smoke prod (pós-deploy)

| Check | Status |
|-------|--------|
| Home 200 | **PASS** |
| Tip JS = dist | **PASS** · `index-CXCg7fhR.js` |
| Chunks consult/hub 200 + `consultar-mestre` no index | **PASS** |

## Evolução 2026-11-27 (multi · `/` · Demanda)

Ver VAL completo: [FAL_MARCHA_CONSULTAR_MULTI_PARSE_DEMANDA_VAL_2026-11-27.md](../dados/FAL_MARCHA_CONSULTAR_MULTI_PARSE_DEMANDA_VAL_2026-11-27.md).

| Peça | Tip |
|------|-----|
| FIPE multi-modelo + anos | PASS |
| Fan-out versões `/` `|` na prévia/apply | PASS |
| Demanda qualquer termo | PASS |
| `?quality=review` + Ver no cadastro | PASS |
| Diff merge vida (sem duplicar anos) | PASS |

## STOP

Sem Netlify nesta marcha. MCP FIPE Cursor fora do produto.
