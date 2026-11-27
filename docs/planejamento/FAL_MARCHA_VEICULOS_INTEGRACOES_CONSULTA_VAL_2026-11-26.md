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
| Branch | `dev` (FF → `main` nesta marcha) |
| Escopo paths | hub · consult page · preview · diff/consult services · Edge FIPE · smokes |

## Smoke / testes (pré-deploy)

| Check | Status |
|-------|--------|
| Vitest hub/consult/diff/fuel/nav/assertiveness/layout | **PASS** · 69 |
| `pnpm run build` (`tsc -b` + vite) | **PASS** |
| Chunks consult/hub no dist | **PASS** · `AdminVehicleMasterConsultPage-*` · `AdminVehicleIntegrationsHubPage-*` |

## Deploy

| Peça | Fato |
|------|------|
| Host | `falpecasautomotivas.com` · `hosting_deploy-static-website` |
| Edge FIPE | Deployed ACTIVE + `FIPE_API_TOKEN` set |
| Tip live | (preencher pós-upload) |

## Smoke prod (pós-deploy)

| Check | Status |
|-------|--------|
| Home 200 | (pós) |
| Tip JS = dist | (pós) |
| Admin → Integrações → Consultar e escolher | (pós) |

## STOP

Sem Netlify nesta marcha. MCP FIPE Cursor fora do produto.
