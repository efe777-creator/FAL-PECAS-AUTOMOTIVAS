# VAL — PLANO 2B · Immersive Garage (Camada 1)

**Planejamento:** [FAL_PLANO2B_IMMERSIVE_GARAGE_2026.md](../../docs/planejamento/FAL_PLANO2B_IMMERSIVE_GARAGE_2026.md)  
**Branch:** `dev` · **Camada 1:** E0–E4 · **Fase A:** consolidação  
**Data:** 2026-11-18  
**Produção:** `main` / deploy **não** autorizados neste ciclo

> **Escopo deste VAL:** Camada 1 (config visual + preview + viewer **procedural** + sync opt-in).  
> **Fora:** Camada 2 GLB realista (Fase B), AR/WebXR (Fase C). E3 procedural **≠** produto 3D realista.

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

---

## Fase A — encerramento

| Critério | Status |
|----------|--------|
| Doc canônico §2.1–§9 sync | Feito |
| A1 auditoria | Feito (tabela acima) |
| A2 privacidade (filtro owner + copy wizard; sem checkbox) | Feito |
| Vitest contratos | **37 PASS** (2026-11-18) |
| Smoke manual | Pendente operador |
| GLB / AR / `main` | **Não** neste VAL |

**Homologação Camada 1 (código/contrato):** PASS na `dev`. Smoke manual restante antes de auth de `main`.

---

## Fora deste VAL

- Fase B (biblioteca GLB / viewer realista) — ver doc Fase B (E0–E5 na `dev`)  
- Fase C C4+ (AR comercial) — C0–C3 na `dev` (gate + sessão + hit-test + GLB-in-XR; default off); ver `FAL_PLANO2B_FASE_C_XR_2026.md`  
- Merge `main` / deploy Netlify produção  
- Promoção de prefs visuais na transferência  
