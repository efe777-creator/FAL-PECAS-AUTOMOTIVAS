# FAL Adaptive Workspace — Spec (2026-11-17)

## Objetivo

Central de Pedidos como ambiente de trabalho modular (lista + preview somente-leitura + tela completa), com shell reutilizável no Painel ADM. Sem mutações de negócio fora de `/admin/pedidos/:id`.

## Decisões travadas

| Decisão | Escolha |
|---------|---------|
| Interação com pedido | Preview split + página completa |
| Navegação hub | Abas L1; KPIs não duplicam deep-links |
| Tema | Tokens admin existentes (claro/dark via toggle) |
| Escopo Fase 1 | Fundação + Pedidos + piloto Dashboard split |
| URL | `?tab=` / `?area=` / manter `?fila=` (sem `?filtro=`) |
| Preview | Somente leitura |
| Persistência | `fal-admin-workspace-v1` ortogonal ao RGL |
| PDF | Stub; print HTML via detail |
| Branch | `dev` |

## Cinco níveis

1. **Navegação principal (abas):** Visão geral · Pedidos · Comercial · Logística · Financeiro  
2. **Mini menus:** filtros, filas, ações de linha (navegação/print)  
3. **Área principal:** tabelas, indicadores, filas  
4. **Painel contextual:** preview RO do pedido  
5. **Tela completa:** `/admin/pedidos/:id` ou painel em fullscreen de layout  

## Quatro modos de painel

| Modo | Comportamento |
|------|----------------|
| `split` | Lista + preview lado a lado |
| `expanded` | Preview ampliado |
| `fullscreen` | Só contextual; Restaurar |
| `collapsed` | Só lista (fecha preview) |

## URL canônica (hub)

| Estado | URL |
|--------|-----|
| Visão geral | `/admin/pedidos` ou `?tab=visao-geral` |
| Pedidos | `?tab=pedidos` (+ `&area=separacao`) |
| Comercial | `?tab=comercial` (+ `&area=aguardando-pagamento\|analise`) |
| Logística | `?tab=logistica` (+ `&fila=…`) |
| Financeiro | `?tab=financeiro` |

### Redirects onda 1 (legado → hub)

| De | Para |
|----|------|
| `/admin/pedidos/aguardando-pagamento` | `?tab=comercial&area=aguardando-pagamento` |
| `/admin/pedidos/analise` | `?tab=comercial&area=analise` |
| `/admin/pedidos/separacao` | `?tab=pedidos&area=separacao` |
| `/admin/pedidos/expedicao?fila=X` | `?tab=logistica&fila=X` |
| `?fila=revisao` | `/admin/pedidos/visao/revisao-logistica` |

`/lista` e `/visao/*` permanecem nesta fase.

## Fronteira RO

**Preview/menu:** leitura, abrir full, copiar ID, print HTML (após detail), PDF stub.  
**Proibido:** ship, cancel, packing, ME purchase, separação editável, estorno.

## Persistência

- Key: `fal-admin-workspace-v1` — só `mode` + `splitWidthPx` por módulo.  
- Não gravar `selectedOrderId`.  
- Não tocar `fal-admin-dashboard-layout-v1`.

## Arquivos principais

- `fal-pecas/src/components/admin/workspace/*`
- `fal-pecas/src/components/common/DropdownMenu.tsx`
- `fal-pecas/src/components/admin/orders/OrderPreviewPanel.tsx`
- `fal-pecas/src/components/admin/orders/OrderRowActionsMenu.tsx`
- `fal-pecas/src/lib/adminOrdersUrl.ts`
- `fal-pecas/src/lib/adminWorkspacePrefs.ts`
- `fal-pecas/src/pages/admin/orders/AdminOrdersHubPage.tsx`
- `fal-pecas/src/pages/admin/AdminDashboardPage.tsx`

## Fora de escopo

PDF nativo, unificar `/lista`/`visao`, Adaptive em outros módulos, multi-painel 3+.

## Aceite

Ver checklist em [`FAL_MARCHA_ADAPTIVE_WORKSPACE_VAL_2026-11-17.md`](./FAL_MARCHA_ADAPTIVE_WORKSPACE_VAL_2026-11-17.md).
