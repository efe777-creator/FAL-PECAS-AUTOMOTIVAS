# Consolida 3D — MARCHA TESTAR GARANTIR (2026-11-18)

Branch alvo: `dev` · sem `main`/Netlify prod neste gate.

## Resultado: **PASS** (com follow-ups)

| Gate | Evidência | Status |
|------|-----------|--------|
| Vitest garage/consolida | 22 files · **62 tests** PASS | PASS |
| `tsc -b` | Limpo após correções XR/ADM | PASS |
| Migration status + ownership RPC | check `review/retired`; RPC com `is_staff` + `current_customer_id` | PASS |
| Smoke asset Palio | `fal-smoke-palio-box` approved · compat 2015–2015 approved · facelift null | PASS |
| Edge `carimages-image` | HTTP 200 · Fiat/Palio/2015 · CDN URL · `fallback:false` · ~878ms | PASS |
| UI Visual Palio | Engine: **3D GLB (asset aprovado)** · status `ready · órbita · zoom` · presets Reset/¾/Frente/Lado/… | PASS |
| Stock 2D CarImages no hero | Label “Imagem ilustrativa (estúdio · CarImages)” + disclaimer | PASS |
| Sync G7 | TDI1006 “no modelo (2A)” com opt-in ligado | PASS |
| Preset Lado clicável | Botão Lado ativo/focado sem erro | PASS |
| ADM Modelos 3D UI | Tab ficou em “Verificando permissões…” (a11y vazio) — não bloqueia Visual cliente; reabrir com sessão staff | PARTIAL |
| F7 polish / main / prod | Fora de escopo | BLOQUEADO |

## Correções feitas neste TESTAR

- `VehicleXrLauncher`: telemetria `reducedMotion: reduceMotion` (quebrava `tsc`)
- `adminVisualAssetService`: ramo morto TS2367 removido
- `visualXrSession`: `hitTestSource` coalesce `?? null`

## Follow-ups (não bloqueiam PASS deste gate)

1. **Rotacionar** key CarImages (vazou no terminal) e atualizar secret.
2. Smoke box continua sendo cubo — modelo real só após curadoria ADM.
3. Domain lock no dashboard CarImages recomendado.
