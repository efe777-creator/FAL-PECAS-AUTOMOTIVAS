# Status marcha Git — FINAL 2026-10-06

## Tips (local ≡ origin)

| Branch | Tip |
|--------|-----|
| `plan` | _(este commit)_ |
| `dev` | `ae4c054` |
| `main` | `762c697` (PR #1 mergeado) |

## Feito nesta marcha

- Testes área pricing/shipping **PASS** + build **PASS** em `dev`
- Docs em `plan`: IMPORT F8.1 + GATE F8.5 + init F9
- `feat/f8.4` / `feat/f8.5` / `feat/f8.5-p1` / `feat/f9-a` → `dev`
- Apply F8.5 prepared + registro em `schema_migrations`
- Smoke pós-apply SQL (coluna %, Promocional 10%, manual estável)
- **PR #1 `dev→main` MERGED** → `main` @ `762c697`
- F9-A validado em `main` (PAC/SEDEX sandbox + testes unitários)

## Fora / residual

- UI vitrine em `feat/vitrine-category-icons` @ `69ed277` (**não** mergeada em `dev`)
- Checkout smoke calculated com custo real (sem seed)
- F8.6–F8.9; F9-B…E

## Ruído local (não versionar)

`agent-tools-*`, `.temp`, `ARQUIVOS IMPORTAÇÕES/`
