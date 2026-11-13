# VAL — Jornada Fase B Expedição

**Data:** 2026-11-13  
**Spec:** [FAL_SPEC_JORNADA_FASE_B_EXPEDICAO_2026-11-13.md](./FAL_SPEC_JORNADA_FASE_B_EXPEDICAO_2026-11-13.md)  
**Migrations:** `20261113150000_fase_b_own_dispatch_tracking.sql` (+ edge `melhorenvio-label`)

## Gate MARCHA

| Campo | Valor |
|-------|--------|
| Código | SIM |
| SQL remoto | **APLICADO** 2026-11-13 (`admin_set_own_dispatch_details`) |
| Edge ME | **DEPLOYED** `melhorenvio-label` 2026-11-13 |
| Smoke humano | ABERTO |
| Teste automático A/B | **SIM** — [FAL_MARCHA_JORNADA_FASE_AB_TESTE_COMPLETO_VAL_2026-11-13.md](./FAL_MARCHA_JORNADA_FASE_AB_TESTE_COMPLETO_VAL_2026-11-13.md) |
| Aprovação eFe | **MARCHA** 2026-11-13 |

## Smoke

| # | Cenário | OK |
|---|---------|-----|
| 1 | ME: snapshot mostra medidas (objeto) vs packing | [ ] |
| 2 | ME: Usar packing → Cotar etiqueta (interno) sem mudar frete cliente | [ ] |
| 3 | ME: Atualizar rastreio do Melhor Envio / salvar manual | [ ] |
| 4 | Own: selecionar Uber/99, custo app, G8 atualiza, frete cliente igual | [ ] |
| 5 | Own: link rastreio; cliente vê link em Meus pedidos | [ ] |
