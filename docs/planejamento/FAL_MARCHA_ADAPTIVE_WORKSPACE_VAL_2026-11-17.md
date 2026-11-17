# FAL — Marcha Adaptive Workspace VAL (2026-11-17)

Branch: **`dev`**. Spec: [`FAL_SPEC_ADAPTIVE_WORKSPACE_2026-11-17.md`](./FAL_SPEC_ADAPTIVE_WORKSPACE_2026-11-17.md).

## Avaliação plano × implementação

| Item decidido | Status | Evidência |
|---------------|--------|-----------|
| Preview split + página completa | OK | `AdaptiveWorkspace` + `OrderPreviewPanel` + `/:id` |
| Abas L1 sem deep-links duplicados | OK | Hub: chips/abas navegam; KPIs visão geral não-link para mesmas filas |
| Tema tokens admin | OK | Sem skin dark exclusiva |
| Preview somente leitura | OK | Sem mutations no preview/menu; policy + rg |
| `?fila=` mantido | OK | `adminOrdersUrl` + hub logística |
| Onda 1 redirects 4 áreas | OK | `RedirectLegacyOrdersArea` |
| `fila=revisao` → visão | OK | `legacyAreaPathToHub` |
| Return path path+search + `/admin` | OK | `adminOrdersNav` |
| Workspace storage ortogonal | OK | `fal-admin-workspace-v1` vs layout RGL |
| PDF stub + print HTML | OK | `printOrderDocument` + item disabled |
| Piloto Dashboard split | OK | Atenção / 1º da fila → preview |
| `/lista` e `/visao` intactos | OK | Rotas preservadas |

## Testes automatizados (rodar em `fal-pecas/`)

```bash
npm test -- src/lib/adminOrdersUrl.test.ts src/lib/adminWorkspacePrefs.test.ts src/lib/orderPreviewPolicy.test.ts src/lib/adminOrdersNav.test.ts src/lib/adminOrderOps.areas.test.ts
npx tsc --noEmit
```

Guardrail:

```bash
rg "admin(Ship|Cancel|CompleteSeparation|SetOrderPacking|AdvanceOrder|MarkPaymentRefunded)" src/components/admin/orders/OrderPreviewPanel.tsx src/components/admin/orders/OrderRowActionsMenu.tsx
# esperado: sem matches
```

## Smoke manual

- [ ] `/admin/pedidos` — abas Visão geral / Pedidos / Comercial / Logística / Financeiro
- [ ] Selecionar pedido → split → Expandir / Tela cheia / Recolher / Fechar
- [ ] Mini menu: copiar ID, print (com pop-up), PDF disabled
- [ ] “Ver página completa” → `/:id` → Voltar restaura `?tab`/`area`/`fila`
- [ ] Bookmark `/admin/pedidos/analise` redireciona hub comercial
- [ ] `/admin/pedidos/expedicao?fila=volumes` preserva fila
- [ ] `/admin` — clique linha atenção abre preview; link “Abrir” vai ao detalhe; Voltar `/admin`
- [ ] Reset layout do Painel não zera modo do workspace

## UI referência (2026-11-17, opção B)

Visão geral alinhada à composição da referência (tema claro): KPIs → faixa financeira → abas → áreas (`setHubParams`) → chips + tabela → drawer com abas Resumo/Produtos/Pagamento/Histórico. Adaptive Workspace preservado.

### Correções pós-análise (mesmo dia)

- `sanitizeOrdersHubState` + rewrite de query: area/fila órfãs ao trocar aba (`?tab=pedidos&area=analise` etc.)
- Stack Visão geral: KPIs/financeiro **antes** das abas L1
- Financeiro sem indicadores: `ErrorState` em vez de tela vazia
- Badge de status no `PanelChrome` (`contextualStatusBadge`); preview sem chip duplicado no hub
- KPIs clicáveis → chips da tabela; fetch morto de atenção removido do hub

## Resultado

**Implementação Fase 1 + UI referência + correções de análise na `dev`.** Smoke visual pendente de homologação no browser do operador.
