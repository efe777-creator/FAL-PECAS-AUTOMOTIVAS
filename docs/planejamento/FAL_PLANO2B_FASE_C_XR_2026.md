# FAL — PLANO 2B · Fase C — XR / AR experimental

**Status:** **C0–C1 na `dev`** (gate + detecção WebXR + launcher com fallback). **Sem** `main`.  
**Data:** 2026-11-18  
**Branch:** `dev`  
**Auth:** MARCHA eFe pós Fase B E0–E5  
**Pai:** [FAL_PLANO2B_IMMERSIVE_GARAGE_2026.md](./FAL_PLANO2B_IMMERSIVE_GARAGE_2026.md)

---

## 1. Objetivo

Expor um **adapter XR** no Visualization Engine, atrás de **gate explícito**, sem tornar XR obrigatório e **sem** criar fato 2A.

### 1.1 Fora de escopo (C1)

- Experiência AR de produto completa / tracking de peça  
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
| **C2+** | Sessão imersiva rica / hit-test / peças | Futuro + nova auth |

---

## 4. Contratos

1. Visual ≠ fato (inclui sessão XR).  
2. Fallback obrigatório para glb/procedural/2d.  
3. Telemetria sem PII (`source: xr`).  
4. Camada 1/2 intactas.
