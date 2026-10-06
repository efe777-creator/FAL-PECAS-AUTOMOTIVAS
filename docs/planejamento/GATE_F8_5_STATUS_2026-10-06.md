# Gate F8.5 — status FINAL 2026-10-06

| Item | Status |
|------|--------|
| Opção A | **FECHADA** |
| Código em `dev` | `ae4c054` (P1 incluso) |
| Código em `main` | `762c697` (PR #1 mergeado) |
| Apply prepared `20261006160000…` | **APLICADO** via `supabase db query --linked -f` |
| Histórico `schema_migrations` | **REGISTRADO** (`20261006160000` / `list_extra_cost_percent_prepared`) — insert pontual (sem repair em massa) |
| Coluna `list_extra_cost_percent` | **existe** (numeric) |
| Overload `compute_item_cost_total(..., price_list_id)` | **existe** |
| Persistência `%` (Promocional=10) | **PASS** |
| Manual TDI1083 R$ 55 | **estável** (origin manual) |
| Preview TS `40→46` @ 10% | **PASS** |
| Smoke UI save pós-apply | parcial (confirm dialog / ambiente); SQL confirma coluna+persistência |
| Recalc calculated com custo real | **N/A dataset** — nenhum `product_base_cost` populado no ambiente |
| Checkout smoke | **pendente** (sem SKU calculated com custo) — **não bloqueia** promote |
| PR `dev→main` | **MERGED** — [#1](https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS/pull/1) @ `762c697` |

## Gate F8.5

**FECHADO** para promoção. Limites de smoke (sem custo base no seed) aceitos.

Nota: `supabase db push --linked` falhou com `DbPushMissingLocalError`. Apply + registro de histórico foram pontuais; sem `migration repair` em massa.
