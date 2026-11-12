# VAL consolidado — Jornada cliente + operador · 2026-11-12

## Smokes

| # | Fluxo | Ref |
|---|-------|-----|
| A | Auth opt-in + 6246 unstick | `FAL_VAL_AUTORIZACAO_CLIENTE_POLITICA_2026-11-12.md` |
| B | Mid-pay → confirmação | `FAL_VAL_CHECKOUT_PAGAMENTO_ATUALIZA_TELA_2026-11-12.md` |
| C | PDP Voltar + handoff frete | ProductCard `state.from` + banner checkout |
| D | Pós-entrega confirmar/problema | RPCs `customer_confirm_receipt` / `customer_report_delivery_issue` |
| E | Frete interno | `FAL_VAL_OPS_FRETE_INTERNO_SNAPSHOT_2026-11-12.md` |

## Migrations locais

- `20261112195000_staff_customer_decision_opt_in.sql`
- `20261112196000_customer_post_delivery_actions.sql`

Aplicadas no remoto via `supabase db query` (histórico migrate repair pendente).
