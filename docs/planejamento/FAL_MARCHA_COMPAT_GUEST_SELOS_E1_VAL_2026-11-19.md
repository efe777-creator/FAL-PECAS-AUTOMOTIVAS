# VAL — Compat guest + selos E.1

**Data:** 2026-11-19 · **Branch:** `dev`  
**Plano:** Compat sem login + selos E.1 (cruzado canônico / header / PLANO1)

## Aceite

| Critério | Status |
|----------|--------|
| Visitante confirma modelo sem conta | PASS (chip + sessão `guest`) |
| Auth só ao salvar na garagem (login ou cadastro) | PASS |
| Sem fit → zero selo | PASS |
| Com fit → PVC + Compatível/similar/A verificar; incompatível some; ranking | PASS (código + vitest) |
| M24 picker ≠ chip | PASS (CatalogPage não chama setSession/setActive) |
| M25 fit chip vs URL | PASS (`resolveFitContext`) |
| Docs spec header + nota canônico | PASS |

## Comandos

```bash
npx vitest run src/services/compatibility/compatibilityEngine.test.ts src/services/garage/activeGarageStorage.test.ts
```

**Assinatura:** MARCHA compat guest + E.1 · 2026-11-19
