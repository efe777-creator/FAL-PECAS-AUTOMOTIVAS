# VAL — PLANO 2B · Immersive Garage

**Planejamento:** [FAL_PLANO2B_IMMERSIVE_GARAGE_2026.md](../../docs/planejamento/FAL_PLANO2B_IMMERSIVE_GARAGE_2026.md)  
**Fase B:** [FAL_PLANO2B_FASE_B_3D_ASSETS_2026.md](../../docs/planejamento/FAL_PLANO2B_FASE_B_3D_ASSETS_2026.md)  
**Fase C:** [FAL_PLANO2B_FASE_C_XR_2026.md](../../docs/planejamento/FAL_PLANO2B_FASE_C_XR_2026.md)  
**Branch:** `dev` · **Camada 1** E0–E4 · **Fase A** · **Fase B E0–E5** · **Fase C C0–C4**  
**Tip consolidação código:** `1ecac1d` (C4) · **Data:** 2026-11-18  
**Produção:** `main` / deploy **não** autorizados neste ciclo

> **Escopo VAL Camada 1 (abaixo):** config + preview + procedural + sync.  
> **Extensão B/C:** evidências código/contrato na `dev` (seções finais). E3 procedural **≠** GLB realista.

---

## A1 — Auditoria de implementação (`dev`)

| Item | Resultado | Evidência |
|------|-----------|-----------|
| Tip commits E1–E4 | PASS | `287fdaf` → `00b27d6` → `76c24bb` → `1ac7eab` |
| Migration E1 ordem | PASS | `20261118230000` após `…220000` plano2a E5 |
| RPC `upsert_vehicle_visual_config` | PASS | Não toca events/G7; exige owner vigente |
| RLS visual | PASS | SELECT/INSERT/UPDATE por `owner_customer_id` (+ staff / visibility) |
| `accept_vehicle_transfer` | PASS | **Não** reatribui `vehicle_visual_configs`; só evidence com consent |
| E2 preview | PASS | `vehicleVisualPartPreview.ts` read-only G7 |
| E3 procedural | PASS | `VehicleViewer3D.tsx` sem GLB; lazy; `canUseWebGL` |
| E4 sync | PASS | `visualInstallSync.ts` opt-in; `visualSyncNeverWrites2A()` |
| Hardening serviço | PASS Fase A | `getMyVisualConfig` filtra `owner_customer_id` atual |

---

## Matriz de testes

| Grupo | Teste | Resultado esperado | Status |
|-------|-------|--------------------|--------|
| E1 | Salvar configuração | Persistência via RPC | **Código** · smoke manual pendente |
| E1 | Recarregar | Config do **meu** owner | **Código** (`eq owner_customer_id`) |
| E1 | Não autorizado | RPC/RLS nega | Contrato RLS |
| E1 | Salvar cor | Sem evento 2A/G7 | Vitest `visualSaveCreatesInstallationEvent` |
| E2 | Preview peça | Sem escrita comercial | Vitest `previewIsReadOnly` |
| E2 | Compra sem instalação | Estado ≠ instalada | Vitest preview |
| E2 | Preview ≠ instalação física | Sync off sem marcadores | Contrato E4 |
| E3 | WebGL off | Fallback 2D | Vitest `resolveViewerMode` |
| E3 | Three lazy | Import dinâmico painel | Código |
| E3 | Sem GLB | Procedural only | Auditoria A1 |
| E4 | Sync off | `partsForModelReflection` = [] | Vitest |
| E4 | Sync on | Só elegíveis | Vitest |
| E4 | Repetir sync | Sem duplicar fatos | Vitest merge idempotente |
| E4 | Write-back | Nunca | `visualSyncNeverWrites2A` |
| Privacidade | Transferência | Não herda private visual | Vitest `visualPrivacyContract` + RPC audit |
| Privacidade | Wizard | Sem checkbox promoção visual | `transferWizardPromotesPrivateVisual` = false |
| Privacidade | Share | Sem edit visual | Contrato |
| Privacidade | Novo owner SELECT | Não usa config do anterior | `getMyVisualConfig` + pickMy |
| Segurança | RPC/RLS | Isolamento | A1 |

### Regressão 2A (obrigatória conceitual)

Rodar suite garagem 2A existente:

```bash
cd fal-pecas
npm test -- --run src/services/garage/ src/services/customers/customerVehicleService.e1.test.ts
```

---

## Testes automatizados 2B (Fase A)

```bash
cd fal-pecas
npm test -- --run src/services/garage/vehicleVisualTypes.test.ts src/services/garage/vehicleVisualPartPreview.test.ts src/services/garage/visualInstallSync.test.ts src/services/garage/visualPrivacyContract.test.ts src/lib/visualViewerPrefs.test.ts src/lib/webglSupport.test.ts
```

**Resultado 2026-11-18 (Fase A):** **16 files / 37 tests PASS** (suite garage + E1 customer + contratos 2B).

---

## Smoke manual sugerido (`dev`)

1. `?modulo=visual` — salvar cor; F5; conferir persistência.  
2. Sem WebGL / pref `2d` — silhueta SVG.  
3. Pref `3d` — procedural (não esperar realismo GLB).  
4. Sync off — sem marcador verde de instalação.  
5. Com `installed_declared` + sync on — marcador / “no modelo (2A)”.  
6. Transferência: copy do wizard informa que Visual **não** transfere; novo owner sem prefs do anterior.  
7. Confirmar que salvar visual **não** cria linha em histórico técnico.

### Smoke executado (MARCHA 2026-11-18 · `localhost:5173`)

| # | Check | Resultado |
|---|--------|-----------|
| S1 | Vitest garage + visual prefs | **22 files / 58 tests PASS** · `tsc --noEmit` OK |
| S2 | `?modulo=visual` Fiat Palio (`FAL-B3B53031`) | Painel carrega · Engine região presente |
| S3 | Pref `auto` | Engine · resolvido: **3D procedural** |
| S4 | Pref `2d` | Engine · resolvido: **2D** · copy “não é registro técnico” |
| S5 | Sync instalação | Opt-in visível · **desligado** · “nenhum fato” |
| S6 | XR UI | **Ausente** (gate env off — esperado) |
| S7 | Salvar aparência | Click → botão disabled (submit) → reabilitado |
| S8 | ADM `/admin/modelos-3d` | Página “Modelos 3D (Camada 2)” + copy Visual≠fato |
| S9 | `VITE_FAL_VISUAL_XR=1` local | Checkbox **XR experimental** aparece (antes ausente) |
| S10 | Opt-in XR localStorage | Liga → “ativo nesta máquina”; `fal-garage-visual-xr-v1=1` |
| S11 | Desktop sem sessão XR | `navigator.xr` presente mas `isSessionSupported(ar/vr)=false` → Engine **não** resolve `xr` (fica procedural); HUD XR ausente |
| S12 | Privacidade visual / transferência | Vitest `visualPrivacyContract` **4 PASS** · copy wizard: Visual **não** transfere (`VehicleTransferPanel`) |
| — | Sessão imersiva / hit-test headset | **Pendente / BLOCKED desktop** — recheck SEQUENCIAL #2: `ar/vr=false`; auth `MARCHA HEADSET` |
| — | GLB ops + Engine | **PASS** (SEQUENCIAL #2) — migration E2 remota; ADM draft→approve→compat Fiat/Palio 2015; Engine `3D GLB` no Palio |
| — | Sync-on com fato G7 | **SKIP** — Palio sem `installed_declared` / eventos instalação |
| — | Sync on com `installed_declared` | Sem fatos no veículo de teste |

---

## Fase A — encerramento

| Critério | Status |
|----------|--------|
| Doc canônico §2.1–§9 sync | Feito |
| A1 auditoria | Feito (tabela acima) |
| A2 privacidade (filtro owner + copy wizard; sem checkbox) | Feito |
| Vitest contratos | **37 PASS** (2026-11-18) |
| Smoke Camada 1 (browser `dev`) | **PASS** 2026-11-18 — S1–S8 |
| Smoke gate XR desktop (S9–S11) | **PASS** — env+opt-in; sem sessão → sem resolve `xr` |
| Smoke sessão XR headset | Pendente device real |
| `main` / deploy | **Não** |

**Homologação:** código + smoke browser Camada1/ADM + gate XR desktop PASS na `dev`. Sessão headset + `main` ainda pendentes.

---

## Fase B — evidências (`dev`)

| Item | Status | Tip / artefato |
|------|--------|----------------|
| E0–E1 Engine | PASS código | `3e8b745` · `visualizationEngine.ts` |
| E2 assets + storage | PASS código | `db726a0` · migration `…240000` |
| E3 GLB lazy + fallback | PASS código | `e835a17` · `VehicleGlbViewer.tsx` |
| E4 ADM `/admin/modelos-3d` | PASS código | `44efddc` |
| E5 perf / a11y / telemetria | PASS código | `80bf202` · `visualTelemetry.ts` |

---

## Fase C — evidências (`dev`)

| Item | Status | Tip / artefato |
|------|--------|----------------|
| C1 gate triplo | PASS código | `0d5f0c7` · `visualXrGate.ts` · `VITE_FAL_VISUAL_XR` |
| C2 sessão imersiva | PASS código | `f38101b` · `visualXrSession.ts` |
| C3 hit-test + GLB-in-XR | PASS código | `8a0c694` |
| C4 bridge SKU → ficha | PASS código | `1ecac1d` · `visualXrCommercial.ts` · `xrNeverCheckoutsInSession` |
| Vitest B/C (amostra) | PASS | 5 files / **17 tests** (engine + XR gate/session/commercial + telemetry) 2026-11-18 |
| XR default | OFF | Sem env + opt-in + `navigator.xr` → Engine não resolve `xr` |
| Checkout in-XR (C5+) | **Fora** | Nova auth explícita |

### Smoke XR sugerido (operador, device com WebXR)

1. `VITE_FAL_VISUAL_XR=1` + opt-in no painel visual.  
2. Sem WebXR → fallback viewer normal.  
3. Com AR: hit-test → toque anel → veículo; HUD SKU se sync + peças.  
4. “Ver ficha” encerra XR e abre `/produto/:id` (sem carrinho).  
5. Confirmar que XR **não** cria evento 2A/G7.

---

## Consolidação PLANO 2B (MARCHA pós-C4)

| Critério | Status |
|----------|--------|
| Camada 1 + Fase A código/contrato | PASS |
| Fase B E0–E5 | PASS código `dev` |
| Fase C C0–C4 | PASS código `dev` |
| Smoke browser Camada 1 + ADM | PASS (S1–S8) |
| Smoke gate XR desktop | PASS (S9–S11) |
| Smoke sessão XR headset | Bloqueado → `MARCHA HEADSET` |
| C5+ checkout in-XR | Bloqueado → `MARCHA C5` |
| Merge `main` / deploy | Bloqueado → `MARCHA MAIN` |

**Veredito:** PLANO 2B **ENCERRADO na `dev` (MARCHA STOP)**. Código + smoke desktop (S1–S12) completos. Próximo passo só com auth explícita da tabela Gate pós-2B.

---

## Fora / bloqueado

- Fase C C5+ (checkout / pagamento in-XR)  
- Merge `main` / deploy Netlify produção  
- Promoção de prefs visuais na transferência  
- Ligar `VITE_FAL_VISUAL_XR=1` por default em produção  
