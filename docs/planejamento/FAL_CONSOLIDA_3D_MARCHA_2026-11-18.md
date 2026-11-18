# Consolida 3D — MARCHA (2026-11-18)

Branch: `feature/consolida-3d-automotivo` → integrar em `dev`  
Sem `main` / sem deploy Netlify neste MARCHA.

## Checklist

| Gate | Status |
|------|--------|
| F1 diagnóstico aprovado | PASS |
| F2 PoC CarImages + adapter (sem Engine direto) | PASS |
| F3 compat/review/retired + ADM candidato | PASS · migration `consolida3d_compat_status_ownership` em wtbp |
| F4 Orbit/zoom/presets · sem auto-spin/recolor · estados UI | PASS |
| F5 ownership RPC · secrets Edge · Vitest | PASS |
| F6 Garagem 2D stock/CarImages + Visual 3D | PASS |
| F7 polish Garagem | BLOQUEADO (fora do plano desta consolidação) |
| Secrets CarImages em wtbp + Edge `carimages-image` | PASS (set + deploy) |
| Key rotacionada pós-exposição em terminal | PENDENTE (eFe: Revogar no dashboard e atualizar secret) |
| Merge → `dev` + push | PASS (`ad7bb7b` em `origin/dev`) |
| `main` / produção Netlify | BLOQUEADO |

## Notas

- `VITE_FAL_CARIMAGES=1` só em `.env.local` (não versionado).
- Key/secret **nunca** no Vite nem em commit.
- Smoke manual recomendado em `dev`: Palio GLB orbit; veículo sem asset → “3D indisponível”.
