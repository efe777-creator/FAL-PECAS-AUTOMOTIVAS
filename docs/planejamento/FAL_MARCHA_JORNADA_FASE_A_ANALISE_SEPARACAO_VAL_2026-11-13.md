# VAL — Jornada Fase A Análise → Separação

**Data:** 2026-11-13  
**Spec:** [FAL_SPEC_JORNADA_FASE_A_ANALISE_SEPARACAO_2026-11-13.md](./FAL_SPEC_JORNADA_FASE_A_ANALISE_SEPARACAO_2026-11-13.md)  
**Migration:** `fal-pecas/supabase/migrations/20261113140000_fase_a_analysis_decision_separation.sql`

### Gate MARCHA (código + deploy SQL)

| Campo | Valor |
|-------|--------|
| Código Fase A | SIM |
| SQL remoto `wtbpwuiayednvlhvuhbh` | **APLICADO** 2026-11-13 via `supabase db query --remote` |
| Smoke VAL humano (7 cenários) | ABERTO |
| Teste automático A/B | **SIM** — [FAL_MARCHA_JORNADA_FASE_AB_TESTE_COMPLETO_VAL_2026-11-13.md](./FAL_MARCHA_JORNADA_FASE_AB_TESTE_COMPLETO_VAL_2026-11-13.md) |
| Aprovação eFe | **MARCHA** 2026-11-13 |

## Pré-requisitos

- [x] Migration aplicada no projeto remoto
- [ ] Conta staff + cliente de teste
- [ ] Pedido pago em `em_analise`

## Cenários smoke

| # | Cenário | Passos | Esperado | OK |
|---|---------|--------|----------|----|
| 1 | Happy path | Disponibilidade OK → Confirmar → imprimir lista | `confirmado` → separação; romaneio abre | [ ] |
| 2 | Prazo atualizar e seguir | Item `disponivel_com_prazo` → Atualizar prazo e seguir | `confirmado` + evento prazo; cliente notificado; sem painel 3 ações | [ ] |
| 3 | Prazo pedir cliente | Pedir confirmação (prazo) → cliente Aceitar novo prazo | fica `aguardando_decisao` + `continue_available`; ops notificado; **ops** finaliza → `confirmado` | [ ] |
| 4 | Hold | Item indisponível → Esperar chegada | `aguardando_disponibilidade`; retoma → finalize | [ ] |
| 5 | Parcial | Pedir continuar só disponível → Continuar | fica `aguardando_decisao`; ops finaliza → `confirmado`; separação ignora indisponível | [ ] |
| 6 | Cancel | Pedir escolha → Cancelar pedido | `cancel_order` + `cancellation_request=pending` | [ ] |
| 7 | Legado | Pedido com `authorized` antigo → finalize staff | Ainda confirma | [ ] |

## Notas

- Totais do pedido **não** mudam; estorno parcial é manual.
- WhatsApp / ME webhook / expedição = Fase B.

## Resultado

- Data execução automática: **2026-11-13** (RPCs + vitest + tsc + drop overload 2-arg)  
- Executor: Auto / eFe  
- Bloqueios: smoke humano com pedido pago real ainda aberto  

