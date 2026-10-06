# Auditoria F8.3 — Consulta rápida, import Custo/Venda e glossário

**Data:** 2026-10-06  
**Plano:** F8.3 UX e Import (aprovado)  
**Gate:** `npm test` (64) + `npm run build` OK  
**Sem** commit / push / `db push` / migrations

---

## Critério principal (O10)

> Na tela **Listas de preços**, sem abrir o detalhe: selecionar lista, buscar/filtrar, alterar preço e adicionar item por código.

| Verificação | Status | Evidência |
|-------------|--------|-----------|
| Painel na listagem | **PASS (código)** | `PriceListQuickAdjustPanel` em `/admin/precos` |
| Select lista ativa | PASS | limpa `items` imediatamente ao trocar `listId` + loading |
| Busca/filtro | PASS | `filterPriceListItems({ q, origin, withoutPrice })` |
| Alterar preço | PASS | `adminSetPriceListItemPricing({ mode: 'manual' })` — mesmo motor do detalhe |
| Adicionar código | PASS | `adminFindProductIdBySku` + `adminUpsertPriceListItem({ source: 'manual' })`; bloqueia duplicata |
| Abrir lista completa | PASS | link `?tab=produtos` |

**Smoke browser O10:** 🟡 não executado nesta sessão (sem sessão autenticada no browser do agente). Código cobre o aceite; validação humana no navegador recomendada.

---

## Plano × implementação

### Parte A — Consulta e ajuste rápido

| Regra do plano | Cumprido? |
|----------------|-----------|
| Painel em listagem, não 2º detalhe | Sim |
| Anti-vazamento A→B | Sim — `setItems([])` + loading antes do fetch |
| Alterar → `manual`; não mexe `pricing_method` | Sim — só `adminSetPriceListItemPricing` mode manual |
| SKU inexistente / duplicado / preço inválido | Sim |
| Refresh após add/edit | Sim |
| Mesmo motor do detalhe (sem wrapper novo) | Sim |

### Parte C — Import Custo ≠ Venda

| Regra | Cumprido? |
|-------|-----------|
| Passo 0: tipo planilha | Sim em `PriceImportWizard` |
| Venda → `price_list_items` | Sim (fluxo existente) |
| Custo → `adminPreviewCostImport` / `adminCreateCostImport` / `adminApplyCostImport` | Sim — **sem** lógica duplicada |
| Sem `list_type` em `price_lists` | Sim |

### Parte B/E — Glossário (só copy)

| Alvo | Mudança |
|------|---------|
| Listagem | Importar planilha; Configurar (não Editar); form fechado por padrão |
| Detalhe | Configurar lista; Origem PT; Importar planilha |
| Dashboard | Fabricantes = “Fabricante de peça” |
| Carrinho | Finalizar compra; Código; sem jargão localStorage |
| Checkout | título Finalizar compra |
| Catálogo/Card/PDP/Home/Footer | Código / Início / textos humanos |

---

## Arquivos alterados

| Arquivo | Papel |
|---------|--------|
| `fal-pecas/src/pages/admin/prices/PriceListQuickAdjustPanel.tsx` | **Novo** — painel O10 |
| `fal-pecas/src/pages/admin/prices/AdminPriceListsPage.tsx` | Layout + painel + CTAs |
| `fal-pecas/src/pages/admin/prices/PriceImportWizard.tsx` | Tipo Custo \| Venda |
| `fal-pecas/src/pages/admin/prices/AdminPriceListDetailPage.tsx` | Glossário |
| `fal-pecas/src/pages/admin/AdminDashboardPage.tsx` | Copy Fabricantes |
| `fal-pecas/src/pages/Cart/CartPage.tsx` | Copy cliente |
| `fal-pecas/src/pages/Checkout/CheckoutPage.tsx` | Copy |
| `fal-pecas/src/pages/Catalog/CatalogPage.tsx` | Placeholder |
| `fal-pecas/src/pages/Product/ProductPage.tsx` | Código + copy |
| `fal-pecas/src/pages/Home/HomePage.tsx` | Copy |
| `fal-pecas/src/components/layout/Footer.tsx` | Início |
| `fal-pecas/src/components/product/ProductCard.tsx` | Código |

---

## Matriz smoke

| ID | Resultado |
|----|-----------|
| O1 Layout listagem | PASS (código) — stats → painel → form sob demanda → tabela |
| **O10** Consulta rápida | PASS (código) / 🟡 browser |
| O2–O4 Detalhe F8.2 | PASS regressão (sem alteração de motor) |
| O5 Wizard tipo | PASS (código) |
| O6 Import venda | 🟡 browser (fluxo preservado) |
| O7 Import custo | PASS (código) — reusa `adminCostImportService` |
| C1–C3 Cliente copy | PASS (código) / 🟡 browser |

---

## Testes e build

- `npm test`: **64 passed**
- `npm run build`: **OK**

---

## Limitações (🟡)

1. Smoke visual autenticado não rodado pelo agente nesta fatia.
2. Consulta rápida exibe até 50 linhas (500 carregados) — sem paginação server-side.
3. Busca sem `supplier_sku` (igual F8.2).
4. Bulk/formação avançada continuam só no detalhe (proposital).
5. Confirm nativo em pedidos (P1 2026-10-04) fora de escopo.

---

## Aceite vs plano

1. Principal O10 — **atendido no código**  
2. Anti-vazamento — **atendido**  
3. manual ≠ pricing_method — **atendido**  
4. Add SKU sem duplicar — **atendido**  
5. Custo ≠ Venda + reuso cost service — **atendido**  
6. Glossário sem redesign — **atendido**  
7. test/build + relatório + parar — **atendido**

**Parar aqui** — sem commit/push/db push.
