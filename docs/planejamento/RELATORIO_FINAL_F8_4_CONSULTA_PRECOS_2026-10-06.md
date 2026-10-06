# Relatório final F8.4 — Consulta de preços + verificação de seleções

**Data:** 2026-10-06  
**Status:** **APROVADA OPERACIONALMENTE**  
**Restrições desta entrega:** sem alteração de código, sem migration aplicada, sem commit / push / db push.

Fontes: [AUDITORIA_OPERACIONAL_PRECOS_CLASSIFICACAO_2026-10-06.md](./AUDITORIA_OPERACIONAL_PRECOS_CLASSIFICACAO_2026-10-06.md), [AUDITORIA_F8_4_UX_PRECOS_2026-10-06.md](./AUDITORIA_F8_4_UX_PRECOS_2026-10-06.md), [RELATORIO_F8_2_UX_OPERACIONAL_2026-10-06.md](./RELATORIO_F8_2_UX_OPERACIONAL_2026-10-06.md), inspeção somente-leitura do código das telas admin.

---

## 1. Status

F8.4 (consulta rápida + detalhe de listas + classificação 3 níveis na UI + preparação do Adicional %) está **congelada como aprovada operacionalmente**. Smoke real com SKUs reais passou; bugs bloqueantes de usabilidade da rodada foram corrigidos antes deste congelamento.

---

## 2. Funcionalidades concluídas

| Área | Entrega |
|------|---------|
| Consulta rápida `/admin/precos` | Select de lista, busca (vazia = itens), filtro origem / sem preço, add código com foco, anti-vazamento A→B |
| Detalhe `/admin/precos/:id` | Select troca de lista, abas produtos/formação/config, clear ao trocar `:id`, origem ≠ método |
| Formação | Markup / margem / fixo + campo **Adicional de custo (%)** na UI; `list_extra_cost` R$ informativo preservado |
| Classificação | Grupo → Categoria → Subcategoria; 4º nível bloqueado (UI + service); path no select do produto |
| Produto | Preços de lista só leitura no form; link para Listas de preços |
| Prepared SQL | Coluna `%` + seed L3 — **não aplicados** |

---

## 3. Arquivos alterados (rodada F8.4 / auditoria operacional)

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
- Docs de auditoria F8.4 / operacional

*(Este relatório final é apenas documentação — nenhum `src` alterado nesta entrega.)*

---

## 4. Testes e build

| Gate | Resultado |
|------|-----------|
| `npm test -- --run` | **70 PASS** (10 arquivos) |
| `npm run build` | **PASS** (`tsc -b` + `vite build`) |

---

## 5. Smoke real (resumo)

**Operador:** `efe.comercioltda@gmail.com` · **Listas:** Preço Base / Lista Promocional · **SKUs:** TDI1083, SK3248, TDI1004

- Consulta, empty state, Adicionar código (foco SKU): **PASS**
- L3 `TERMINAL LE SMOKE` + classificar TDI1083: **PASS**
- Add/alterar preços (origem Manual): **PASS**
- Troca A→B→A sem vazamento de itens/preços: **PASS**
- Formação + Voltar à consulta: **PASS**
- Bugs bloqueantes no smoke: **nenhum**

Detalhe completo: §2.2 da auditoria operacional.

---

## 6. Verificação de seleções (telas)

Inspeção **somente leitura** vs planos F8.2 / F8.4 / auditoria operacional. Sem correção de código nesta etapa.

### 6.1 Produtos — listagem `/admin/produtos`

| Item | Status | Evidência |
|------|--------|-----------|
| Campo busca nome/SKU | **PASS** | `Input label="Buscar (nome/SKU)"` → `q` + `reload()` |
| Checkbox “Sem imagem / incompletos” | **PASS** | `withoutImage` ligado ao filtro |
| Botão Filtrar (ação real) | **PASS** | `onClick={() => void reload()}` |
| Colunas SKU / Nome / Status / Preço | **PASS** | tabela presente |
| Ações Editar / Arquivar | **PASS** | Link Editar; Arquivar (remover da loja) / Publicar |

**Addendum (pós-freeze F8.4 — backlog §7/§8):** filtros **Status**, **Montadora** (aplicações → `manufacturers`) e **Classificação** (path + subtree); seleção em massa (checkbox página/linha) com **Ativar** / **Arquivar**. Sem exclusão permanente.

### 6.2 Produtos — formulário `/admin/produtos/:id` (e novo)

| Item | Status | Evidência |
|------|--------|-----------|
| Select **Classificação** com path `Grupo / Categoria / Subcategoria` | **PASS** | Label explícita; options via `categoryPath(...)` ordenado |
| Fabricante | **PASS** | `<select>` brands |
| Fornecedor | **PASS** | `<select>` suppliers |
| Status | **PASS** | draft / published / archived |
| Montadora → Modelo → Configuração (cascata) | **PASS** | `adminListModels(makerId)` / `adminListVersions(modelId)` |
| Preços de lista só leitura + links | **PASS** | Bloco “Preços nas listas” + Link `/admin/precos` e `/admin/precos/:id` |

### 6.3 Categorias `/admin/categorias`

| Item | Status | Evidência |
|------|--------|-----------|
| Select **Pai**: só Grupo ou Categoria (bloqueia 4º nível) | **PASS** | `allowedCategoryParents` → depth 1–2; submit disabled se `resultingDepth > 3`; service lança erro no 4º |
| Label dinâmica Grupo/Categoria/Subcategoria | **PASS** | `categoryLevelLabel(resultingDepth)` / editar |
| Busca por path/nome | **PASS** | `Buscar classificação` filtra nome, slug, descrição e path |
| Observação | **OBS** | Label “Novo subcategoria” (gênero); sem impacto operacional (já na auditoria) |

### 6.4 Preços `/admin/precos` e `/admin/precos/:id`

| Item | Status | Evidência |
|------|--------|-----------|
| Select Lista (consulta rápida) | **PASS** | `PriceListQuickAdjustPanel` |
| Filtro Origem + Sem preço | **PASS** | calculated / imported / manual |
| Buscar (vazia = itens da lista) | **PASS** | form + debounce / submit |
| Select troca de lista no detalhe | **PASS** | `onChangePriceList` + clear anti-flash |
| Anti-vazamento A→B | **PASS** | smoke + clear items/listId effect |
| Formação: método + % | **PASS** | select regra + markup/margem |
| Adicional % (campo UI) | **PASS** (UI) / **PENDENTE** (persistência) | campo presente; migration prepared não aplicada |
| Select lista no wizard de import | **PASS** | `PriceImportWizard` lista destino |

### 6.5 Outras (amostra F8.2)

| Tela | Item | Status | Nota |
|------|------|--------|------|
| Fabricantes `/admin/fabricantes` (brands) | Editar com scroll/foco | **PASS** | F8.2-D; status via Ativar/Inativar (sem select cosmético) |
| Montadoras `/admin/montadoras` | Editar com scroll/foco | **PASS** | F8.2-E |
| Fornecedores `/admin/fornecedores` | Editar | **OBS** | Editar seta form; **sem** `scrollIntoView`/`focus` como em marcas/montadoras — backlog UX menor, fora do congelamento F8.4 |
| Veículos | Selects montadora/modelo | **PASS** | presentes na página de veículos |

**Veredito seleções:** nenhum FAIL bloqueante nas telas do escopo F8.4 / produtos / categorias / preços. Observações não bloqueiam o freeze.

---

## 7. Migrations prepared (NÃO aplicadas)

| Arquivo | Conteúdo | Aplicada? |
|---------|----------|-----------|
| `20261006160000_list_extra_cost_percent_prepared.sql` | Coluna `list_extra_cost_percent` + overload SQL de custo | **Não** |
| `20261006160100_category_l3_seed_prepared.sql` | Seed exemplo L3 (Bandeja / Óleo) | **Não** |

`parent_id` N-níveis já existia — **não** houve migration de schema para árvore 3 níveis.

---

## 8. Pendências F8.5 / backlog

| Item | Notas |
|------|-------|
| Persistência e cálculo real do **Adicional %** | Aplicar migration `%` + validar recalc; UI já preparada |
| Seed L3 prepared | Opcional; UI L3 já funciona (smoke criou subcategoria manual) |
| Alinhamento `resolve_product_price(s)` com % | Só após migration + revisão de callers — **não** tocar sem regressão |
| Import `GRUPO` até folha L3 | Fora F8.4 |
| Label “Novo subcategoria” (gênero) | Cosmético |
| UX Editar fornecedores (foco/scroll) | Paridade F8.2-D/E |
| Commit da rodada de código | Quando o time decidir |

---

## 9. Riscos e próximo passo

**Riscos / limitações**

- Até aplicar a migration de `%`, o campo UI grava com aviso gracioso; cálculo no banco permanece legado.
- Checkout / `resolve_product_price(s)` **não** vê o % até migration + alinhamento explícito.
- Limite ~500 itens carregados / ~50 exibidos na consulta rápida (copy já explícita).

**Próximo passo recomendado**

1. Manter freeze F8.4 — sem db push / sem aplicar metade da migration.
2. Planejar **F8.5** como pacote: `list_extra_cost_percent` + overload SQL + validação de recalc; só depois avaliar resolve.
3. Commit do código da rodada quando houver decisão explícita do time.

---

## Tabela final

| Área | Status |
|------|--------|
| F8.4 consulta / ajuste | **APROVADA OPERACIONALMENTE** |
| Classificação 3 níveis (UI) | PASS |
| Selecões Produtos / Categorias / Preços | PASS (OBS menores) |
| Adicional % persistência | PENDENTE F8.5 |
| Seed L3 prepared | PENDENTE (opcional) |
| Testes 70 / Build | PASS |
| Smoke real | PASS |
| Código nesta entrega | **nenhuma alteração** |
| Migration / commit / push | **não executados** |

**PARAR.**
