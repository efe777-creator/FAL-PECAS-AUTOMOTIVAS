# Auditoria operacional — Preços e classificação

**Data:** 2026-10-06  
**Escopo:** `/admin/precos`, `/admin/precos/:id`, classificação 3 níveis, formação com adicional de custo (%)  
**Restrições respeitadas:** sem db push, sem migration aplicada, sem commit, sem push, sem alteração direta de banco, sem novo motor de preços, sem alteração de `place_order` / estoque F8 / F7 / `resolve_product_price(s)`.

---

## 1. Objetivo

Usar o módulo como **operador real**: consultar lista → buscar produto → classificar → adicionar à lista → informar/alterar preço → verificar origem → abrir formação → voltar. Corrigir bugs de usabilidade e preparar (sem aplicar) o que exigir schema.

## 2. Fluxo operacional testado

### 2.1 Evidência de código (rodada anterior)

| Passo | Onde | Evidência |
|-------|------|-----------|
| Selecionar lista | `PriceListQuickAdjustPanel` select + anti-vazamento | `listId` effect zera `items` e mostra loading |
| Pesquisar produto | Busca + Buscar | `filterPriceListItems` (SKU, nome, manufacturer_code) |
| Classificar | `/admin/categorias` + form produto | UI 3 níveis + path no select |
| Adicionar à lista | Form destacado + `openAddForm` | `adminFindProductIdBySku` + `adminUpsertPriceListItem` |
| Informar preço | Campo Preço de venda | validação `parseMoneyBr` / negativo bloqueado |
| Alterar preço | Alterar → Salvar | `adminSetPriceListItemPricing` mode `manual` |
| Verificar origem | Coluna Origem + mensagem pós-save | `price_origin = manual`; `pricing_method` intacto |
| Abrir formação | Link / `?tab=formacao` | UI com Markup/Margem + Adicional % |
| Voltar | Link “Voltar à consulta” / `/admin/precos` | rotas OK |

### 2.2 Smoke real no navegador (2026-10-06, pré-migration)

**Operador:** `efe.comercioltda@gmail.com` (admin)  
**Listas:** Preço Base (`…1101`), Lista Promocional (`…1102`)  
**SKUs:** TDI1083, SK3248, TDI1004

| # | Passo | Resultado | Evidência |
|---|-------|-----------|-----------|
| 1 | Entrar `/admin/precos` | PASS | Consulta + 2 listas ativas |
| 2 | Selecionar Preço Base | PASS | Lista vazia + form add aberto |
| 3 | Busca vazia / empty | PASS | “Nenhum item nesta lista” |
| 4 | Adicionar código (foco) | PASS | `activeElement` = input Código (SKU) |
| 5 | Criar Subcategoria L3 | PASS | `TERMINAL LE SMOKE` sob Direção / Terminal de direção; “Classificação salva” |
| 6 | Classificar TDI1083 | PASS | Path `Direção / Terminal de direção / TERMINAL LE SMOKE` + Salvar produto |
| 7 | Add SK3248 @ 46,64 | PASS | “Item SK3248 adicionado… origem Manual” |
| 8 | Alterar SK3248 → 50,00 | PASS | “Preço atualizado… Origem: Manual.”; coluna Manual |
| 9 | Add TDI1004 @ 39,90 | PASS | Item na Preço Base, origem Manual |
| 10 | Trocar → Lista Promocional | PASS | Só TDI1083 R$ 55,00; **sem** SK3248@50 nem TDI1004@39,90 |
| 11 | Trocar A→B→A | PASS | Base voltou com SK3248@50 + TDI1004@39,90; sem TDI1083@55 |
| 12 | Formação `?tab=formacao` | PASS | Regra Fixo; Adicional %; list_extra_cost R$ informativo; Voltar consulta |
| 13 | Voltar à consulta | PASS | `/admin/precos` + “Consulta e ajuste” |

**Bugs bloqueantes no smoke:** nenhum.  
**Observação menor:** label “Novo subcategoria” (gênero); sem impacto operacional.  
**Migrations:** nenhuma aplicada nesta etapa.

## 3. Problemas encontrados

1. **Adicionar código** no empty state era no-op (form já aberto, sem scroll/foco).
2. **Remount** do painel em `reload()` com `loading` full-page após alteração de itens.
3. **Flash A→B** no detalhe: `list`/`items` antigos permaneciam até o fetch.
4. **ID inválido** no detalhe sem CTA de volta.
5. **Adicional de custo (%)** inexistente (só markup/margem e `list_extra_cost` R$ placeholder).
6. **Categorias** forçadas a 2 níveis na UI apesar do `parent_id` N-níveis.
7. Select de produto sem path Grupo/Categoria/Subcategoria.

## 4. Correções realizadas

### Consulta rápida
- `openAddForm()`: abre form, `scrollIntoView`, `focus` + `select` no SKU; destaque amarelo.
- Empty state e “+ Adicionar código” usam o mesmo helper.
- Mensagens claras: SKU inexistente, duplicata → Alterar preço, sucesso com origem Manual.
- Anti-vazamento reforçado (clear imediato + geração de load).
- Overview quiet reload (não desmonta o painel).

### Detalhe `/admin/precos/:id`
- Clear de `list`/`items` ao trocar `:id` + loading imediato.
- Empty “Lista não encontrada” com link ← Voltar.
- Tab Formação: labels claros + Adicional de custo (%) + `list_extra_cost` R$ informativo preservado + link voltar.

### Configurar lista (`/admin/precos`)
- Campo Adicional de custo (%) no avançado.
- Persistência via `adminSaveListExtraCostPercent` (falha graciosa se coluna ausente → aviso migration).

### Classificação
- UI Grupo → Categoria → Subcategoria; **4º nível bloqueado** (UI + `adminUpsertCategory`).
- Path na tabela e no produto; arquivar bloqueado com filhos/produtos.

## 5. Itens que já existiam e foram validados

- Rotas `/admin/precos` e `/admin/precos/:id` + `?tab=`.
- Busca vazia lista itens; limite 500 / exibição ~50; footer.
- `filterPriceListItems` inclui `manufacturerCode`.
- `adminSetPriceListItemPricing` / `adminUpsertPriceListItem` / `adminFindProductIdBySku`.
- Separação `pricing_method` ≠ `price_origin`.
- `list_extra_cost` (R$) placeholder fora do cálculo — **mantido**.

## 6. Itens pendentes

| Item | Motivo |
|------|--------|
| Persistência/cálculo real do Adicional % no banco | Migration prepared não aplicada (proposital) |
| Recalc SQL usando overload com `price_list_id` | Depende da migration de % |
| Seed L3 prepared (BANDEJA S/PIVO, 5W30, …) | Não aplicado; L3 criado manualmente no smoke (`TERMINAL LE SMOKE`) |
| Import `GRUPO` resolvendo até folha L3 | Fora desta rodada |
| Alinhamento futuro `resolve_product_price(s)` com % | Só após migration + revisão de callers |

## 7. Arquivos alterados

- `fal-pecas/src/pages/admin/prices/PriceListQuickAdjustPanel.tsx`
- `fal-pecas/src/pages/admin/prices/AdminPriceListsPage.tsx`
- `fal-pecas/src/pages/admin/prices/AdminPriceListDetailPage.tsx`
- `fal-pecas/src/services/admin/adminPriceListService.ts`
- `fal-pecas/src/services/admin/adminPriceListsOverview.test.ts`
- `fal-pecas/src/services/pricing/pricingFormulas.ts`
- `fal-pecas/src/services/pricing/computeCostTotal.test.ts`
- `fal-pecas/src/services/admin/adminCategoryService.ts`
- `fal-pecas/src/services/admin/adminCategoryService.test.ts`
- `fal-pecas/src/pages/admin/categories/AdminCategoriesPage.tsx`
- `fal-pecas/src/pages/admin/products/AdminProductFormPage.tsx`
- `fal-pecas/supabase/migrations/20261006160000_list_extra_cost_percent_prepared.sql` (**não aplicada**)
- `fal-pecas/supabase/migrations/20261006160100_category_l3_seed_prepared.sql` (**não aplicada**)
- `docs/planejamento/AUDITORIA_OPERACIONAL_PRECOS_CLASSIFICACAO_2026-10-06.md` (este)

## 8. Testes executados

```
npm test -- --run
```

**70 testes PASS** (10 arquivos), incluindo `adminCategoryService.test.ts` e `computeCostTotal.test.ts`.

## 9. Build

```
npm run build
```

**PASS** (`tsc -b` + `vite build`).

## 10. Necessidade de migration

Sim, para:

1. Coluna `price_lists.list_extra_cost_percent` + fórmula SQL com %.
2. Seed opcional de subcategorias L3.

**Não** é necessária migration de schema para árvore 3 níveis (`parent_id` já existe).

## 11. Migrations preparadas (NÃO aplicadas)

| Arquivo | Conteúdo |
|---------|----------|
| `20261006160000_list_extra_cost_percent_prepared.sql` | Coluna `%` + overload `compute_item_cost_total`; **não** remove/altera significado de `list_extra_cost` R$ |
| `20261006160100_category_l3_seed_prepared.sql` | Subcategorias exemplo sob Bandeja e Óleo de motor |

## 12. Riscos / limitações

- Até aplicar a migration de `%`, o campo na UI tenta gravar e informa “aguarda migration”; cálculo no banco permanece legado.
- `resolve_product_price(s)` não foi alterado — checkout não vê o % até a migration e eventual alinhamento dos RPCs de resolve.
- Seed L3 prepared ainda não aplicado; no smoke foi criada subcategoria real via UI (não depende do seed).
- Smoke real **executado** com escrita (ver §2.2); Adicional % e seed prepared continuam pendentes de propósito.

## 13. Próximo passo recomendado

1. Manter migrations prepared **sem aplicar** até decidir o pacote completo (coluna % + callers de recalc + eventual resolve).
2. Quando for aplicar: `list_extra_cost_percent` + overload SQL, depois validar `recalculate_*` e só então avaliar `resolve_product_price(s)`.
3. Seed L3 prepared só se quiser os exemplos BANDEJA/5W30 no banco (não urgente — UI L3 já funciona).
4. Commit da rodada de código/UX quando o time decidir (fora deste smoke).

---

## Tabela final

| Área | Status |
|------|--------|
| Consulta rápida | PASS |
| Busca | PASS |
| Alterar preço | PASS |
| Adicionar código | PASS |
| Formação | PASS |
| Adicional de custo | PENDENTE (migration) |
| Classificação 3 níveis | PASS (UI + smoke L3 manual) |
| Seed L3 prepared | PENDENTE |
| Rotas | PASS |
| Usabilidade operador | PASS |
| Smoke real com dados | PASS |
| Testes | PASS |
| Build | PASS |

**PARAR.** Sem commit / push / db push / migration.
