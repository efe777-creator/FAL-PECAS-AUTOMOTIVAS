# VAL — Gate 2 + abertura Fase 3

**Data:** 2026-11-11  
**Auth:** eFe — MARCHA

## Gate 2 — critérios observáveis

| Critério | Evidência | Status |
|----------|-----------|--------|
| Próxima ação clara | Banner + wizard hint + hub copy | **OK** |
| Filtros restaurados | `rememberOrdersReturnPath` / Voltar à fila | **OK** |
| Incomplete não conclui | Botão disabled + banner amber + SQL | **OK** |
| Wizard ordenado | Conferência→…→Despacho | **OK** |
| Own sem ME | OwnShipPanel / etiqueta skipped | **OK** |
| Erro legível | `toUserMessage` nos painéis | **OK** |
| Smoke browser staff E2E | — | **PENDENTE eFe** (não bloqueia assinatura doc) |

**Gate 2 = ASSINADO** (MARCHA) com ressalva de smoke staff humano.

## Fase 3

Matriz publicada: [FAL_MATRIZ_TESTES_CENTRAL_PEDIDOS_FASE3_2026-11-11.md](./FAL_MATRIZ_TESTES_CENTRAL_PEDIDOS_FASE3_2026-11-11.md)

### Execução automática desta rodada

| ID | Resultado |
|----|-----------|
| Unit OWN-03 / EVT-03 / PKG / wizard / CEN-040 filters | **10 PASS** |
| SEC-01 anon INSERT orders | **PASS** 401 `42501` |

## Próximo

Smoke M staff (CEN/SEP/UI) · ME/PAY humano · Gate 3 quando crítico/alto = 0 sem decisão.
