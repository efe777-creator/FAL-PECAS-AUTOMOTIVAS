# VAL — Verificação de suíte (tsc / vitest / build / oxlint)

**Data:** 2026-11-06  
**Auth:** MARCHA  
**HEAD base:** `main` @ merge #154

## Resultados

| Check | Resultado |
|-------|-----------|
| `npx tsc -b` | **PASS** |
| `npx vitest run` | **PASS** — 72 files / **363** tests |
| `npm run build` | **PASS** |
| `npx oxlint` | **PASS** (exit 0) — só **warnings** pré-existentes (fast-refresh, set-state-in-effect, etc.); **0 errors** |

## Correção nesta fatia

| Peça | Mudança |
|------|---------|
| `useUnsavedChangesBlocker` | Guard `prompting` evita diálogo duplicado se o effect reentrar enquanto `blocked` |

## Gate humano

Nenhum.
