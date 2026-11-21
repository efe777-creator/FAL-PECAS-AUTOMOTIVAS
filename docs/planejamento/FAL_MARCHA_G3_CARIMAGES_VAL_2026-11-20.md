# VAL — G3 CarImages stock visual (R4)

**Data:** 2026-11-20  
**Auth:** eFe — MARCHA  
**Branch:** `feature/g3-carimages-stock` → `dev`  
**Deploy:** **NÃO** (sem auth)

## Gate código

| Item | Resultado | Evidência |
|------|-----------|-----------|
| Key fora do Vite | **PASS** | Só `VITE_FAL_CARIMAGES`; key via Netlify.env |
| Function signed-url | **PASS** | `netlify/functions/carimages-signed-url.ts` |
| Builder query unit | **PASS** | `carImagesSignedUrl.test.ts` |
| Resolver ordem + family | **PASS** | `vehicleImageResolver.ts` · label família/estúdio |
| UI disclaimer | **PASS** | `VehicleImageFrame` source carimages |
| Vitest adapter/resolver | **PASS** | suites locais |
| Smoke BR com key nova | **PENDENTE OPS** | `smoke-carimages-g3.mjs` → PENDING_KEY até rotação |
| Deploy Netlify / main | **BLOCKED** | plano + auth |

## Política visual

- Match CarImages = **`family`** (nunca `exact` por fuzzy).  
- Copy: ilustrativa / estúdio ≠ foto do cliente.  
- 2B GLB/XR: **não** alterado.

## Assinatura

VAL G3 CarImages **código PASS** · smoke runtime **pendente key rotacionada** · 2026-11-20.

## MARCHA follow-up (2026-11-20 noite)

- Netlify sites `fal-pecas-automotivas` / `fal-pecas-automotivas-efe`: env `CARIMAGES_API_KEY` **ausente** (404).
- **STOP OPS** até eFe: (1) rotacionar key no dashboard CarImages; (2) setar `CARIMAGES_API_KEY` no Netlify Dev; (3) `node scripts/smoke-carimages-g3.mjs`.
- Deploy / `main`: continua **BLOCKED**.
