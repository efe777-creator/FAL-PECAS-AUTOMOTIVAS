# FAL — PLANO 2B · Fase C — XR / AR experimental

**Status:** **C0–C3 na `dev`** (gate + sessão imersiva + hit-test AR + GLB-in-XR + marcadores). **Sem** `main`.  
**Data:** 2026-11-18  
**Branch:** `dev`  
**Auth:** MARCHA eFe (C0–C3 em sequência na `dev`)  
**Pai:** [FAL_PLANO2B_IMMERSIVE_GARAGE_2026.md](./FAL_PLANO2B_IMMERSIVE_GARAGE_2026.md)

---

## 1. Objetivo

Expor um **adapter XR** no Visualization Engine, atrás de **gate explícito**, sem tornar XR obrigatório e **sem** criar fato 2A.

### 1.1 Fora de escopo (C0–C3)

- Tracking comercial de SKU / checkout em AR  
- Deploy `main`  
- Ligar gate por default em produção  
- Write-back para events/G7  

---

## 2. Gate (obrigatório)

| Camada | Como |
|--------|------|
| Build/env | `VITE_FAL_VISUAL_XR=1` |
| Usuário | Opt-in local `fal-garage-visual-xr-v1` (só aparece se env=1) |
| Dispositivo | `navigator.xr` + `isSessionSupported` (AR ou VR) |
| A11y | `prefers-reduced-motion` → XR bloqueado |

Sem as três primeiras → Engine **não** resolve `xr`.

---

## 3. Roadmap Fase C

| Etapa | Escopo | Status |
|-------|--------|--------|
| **C0** | Este documento + MARCHA | Feito |
| **C1** | Gate + detect + launcher XR + fallback Engine | Feito (`dev`) |
| **C2** | Sessão imersiva viva (Three WebXR + carro procedural) | Feito (`dev`) |
| **C3** | Hit-test AR + GLB-in-XR + marcadores sync | Feito (`dev`) |
| **C4+** | Produto AR comercial (SKU/checkout) | Futuro + nova auth |

### 3.1 Artefatos C2–C3

| Artefato | Papel |
|----------|--------|
| `visualXrSession.ts` | Sessão + hit-test + GLB + markers |
| `VehicleXrLauncher.tsx` | Entra/encerrar; signed URL GLB; fallback |
| Gate C1 | Intactos (env + opt-in + `navigator.xr` + reduced-motion) |

---

## 4. Contratos

1. Visual ≠ fato (inclui sessão XR).  
2. Fallback obrigatório para glb/procedural/2d.  
3. Telemetria sem PII (`source: xr`).  
4. Camada 1/2 intactas.
