# Gate F8.5 — status 2026-10-06 (pós-apply)

| Item | Status |
|------|--------|
| Opção A | **FECHADA** |
| Código em `dev` | `ae4c054` (P1 incluso) |
| Apply prepared `20261006160000…` | **APLICADO** via `supabase db query --linked -f` (`db push` completo bloqueado por histórico remoto divergente — SQL prepared idempotente executado) |
| Coluna `list_extra_cost_percent` | **existe** (numeric) |
| Overload `compute_item_cost_total(..., price_list_id)` | **existe** |
| Persistência `%` (Promocional=10) | **PASS** |
| Manual TDI1083 R$ 55 | **estável** (origin manual) |
| Preview TS `40→46` @ 10% | **PASS** |
| Smoke UI save pós-apply | parcial (confirm dialog / ambiente); SQL confirma coluna+persistência |
| Recalc calculated com custo real | **N/A dataset** — nenhum `product_base_cost` populado no ambiente |
| Checkout smoke | **pendente** (sem SKU calculated com custo) |
| PR `dev→main` | **não aberto** — STOP |

## STOP

Apply + evidências SQL OK. PR `dev→main` só com sua autorização humana após aceitar limites do smoke (sem custo base no seed).

Nota: `supabase db push --linked` falhou com `DbPushMissingLocalError` (versões remotas ausentes localmente). Não rodamos `migration repair` em massa. Apply foi o arquivo prepared pontual.
