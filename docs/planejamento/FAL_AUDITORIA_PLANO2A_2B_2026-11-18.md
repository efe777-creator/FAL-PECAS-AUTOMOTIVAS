# Auditoria MARCHA — PLANO 2A + 2B (design, código, testes)

**Data:** 2026-11-18  
**Branch:** `dev` · tip relatório: este commit  
**Auth:** `MARCHA AUDITORIA E TESTES`  
**Escopo:** verificar se os planos foram **executados** (código + UX/copy + testes). Sem `main` / C5 / headset.

---

## Veredito

| Plano | Código/contrato na `dev` | Design/UX | Testes frescos | Produção |
|-------|--------------------------|-----------|----------------|----------|
| **2A** Vehicle Identity | **PASS** (§24 E1–E5) | **PASS** (workspace `?modulo=`, T10, wizard) | Suite garage + E1: ver abaixo | **Não** (`main` bloqueado) |
| **2B** Immersive Garage | **PASS** (Camada1 + B E0–E5 + C C0–C4) | **PASS** pós-correção copy GLB | **59 PASS** / `tsc` OK | **Não** |

**Conclusão:** planos **executados na `dev`**. Não estão em produção. Fora do escopo fechado: headset XR, C5 checkout in-XR, deploy `main`.

---

## Evidência de testes (esta auditoria)

```text
pnpm exec tsc --noEmit          → exit 0
pnpm exec vitest run src/services/garage/ …
  + customerVehicleService.e1 + visual* prefs/gate
→ Test Files  23 passed · Tests  59 passed
```

---

## Matriz 2A (resumo §24)

| Área | Status |
|------|--------|
| Identity + ownership + RPC atômica | PASS |
| Events / G7 bridge associativa / odômetro | PASS |
| Professionals / manutenções / evidence / shares / transfer | PASS |
| Inteligência + T10 pós-compra | PASS |
| GAPs documentados (G7 `received`, unmerge UI, LGPD ops) | Aceitos no §24 — não bloqueiam fechamento 2A |

---

## Matriz 2B

| Etapa | Status | Artefato |
|-------|--------|----------|
| E1 config visual | PASS | migration `…230000` · `vehicleVisualConfigService` |
| E2 preview G7 | PASS | `vehicleVisualPartPreview` |
| E3 procedural + 2D | PASS | `VehicleViewer3D` · `VehicleSilhouette2D` |
| E4 sync opt-in | PASS | `visualInstallSync` · `visualSyncNeverWrites2A` |
| Fase A consolidação | PASS | VAL + privacidade |
| B E1 Engine | PASS | `visualizationEngine` · `VehicleVisualizationEngine` |
| B E2 assets/storage | PASS | migration `…240000` |
| B E3 GLB lazy | PASS | `VehicleGlbViewer` |
| B E4 ADM | PASS | `/admin/modelos-3d` |
| B E5 perf/a11y/telemetry | PASS | `visualTelemetry` · reduced-motion |
| C1–C4 XR | PASS | gate · session · hit-test/GLB · SKU bridge · `xrNeverCheckoutsInSession` |
| Smoke desktop S1–S12 | PASS | VAL |
| Headset / C5 / `main` | FORA | Gate pós-2B |

---

## Design / UX

| Check | Status | Nota |
|-------|--------|------|
| Visual ≠ fato (copy viewers + toast + ADM) | PASS | Silhouette / procedural / GLB / XR / transfer |
| Engine único (UI não escolhe tech) | PASS | Resolve 2d\|procedural\|glb\|xr |
| Tokens FAL (não ADM na garagem) | PASS | `rounded-fal`, `fal-*` no painel cliente |
| Empty states preview | PASS | `EmptyState` peças |
| Copy painel “ainda sem GLB” | **CORRIGIDO nesta auditoria** | Estava stale pós Fase B |
| Doc §2.1 “Camada 2 não implementada” | **CORRIGIDO nesta auditoria** | Estava stale |
| `aria-pressed` nos toggles Viewer | **PASS** (MARCHA próximo passo) | `role="group"` + `aria-pressed` |
| Biblioteca GLB com assets reais aprovados | **PASS smoke** (MARCHA SEQUENCIAL #2) | `fal-smoke-palio-box` approved + Engine GLB no Palio 2015 |

---

## Gaps remanescentes (não = plano incompleto)

1. Smoke sessão XR em **headset** (precisa hardware).  
2. Deploy Netlify produção (bloqueado até auth explícita — tip `main` já existe, sem deploy).  
3. Sync-on com `installed_declared` real no veículo de smoke (dado — SKIP em SEQUENCIAL #2).  
4. ~~Popular biblioteca GLB (ops ADM).~~ **Feito smoke** (`fal-smoke-palio-box`).  
5. C6+ pagamento **dentro** da sessão XR (fora).  

**Fechados depois da auditoria inicial:** C5 exit-to-cart · a11y toggles Viewer · smoke GLB ADM+Engine.

---

## Ações desta MARCHA

1. Auditoria código ↔ doc ↔ testes.  
2. Correção copy `VehicleVisualPanel` + §2.1/§2.2 canônico.  
3. Checklist 7.1: smoke Camada 1 marcado com evidência VAL.  
4. Este relatório.
