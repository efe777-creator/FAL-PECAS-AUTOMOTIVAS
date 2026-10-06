# Plano mestre — próximas fases F8 (pós F8.4)

**Data:** 2026-10-06  
**Tipo:** INSPECTÃO + ANÁLISE + PLANEJAMENTO (somente leitura do código; este arquivo é a única entrega)  
**Premissa:** F8.4 **APROVADA OPERACIONALMENTE** e congelada.  
**Restrição desta execução:** sem alteração de `src`, SQL, migration, db push, commit, push ou implementação de fase.

Fontes principais:  
[RELATORIO_FINAL_F8_4…](./RELATORIO_FINAL_F8_4_CONSULTA_PRECOS_2026-10-06.md) ·  
[AUDITORIA_OPERACIONAL…](./AUDITORIA_OPERACIONAL_PRECOS_CLASSIFICACAO_2026-10-06.md) ·  
[AUDITORIA_F8_4…](./AUDITORIA_F8_4_UX_PRECOS_2026-10-06.md) ·  
[RELATORIO_F8_2…](./RELATORIO_F8_2_UX_OPERACIONAL_2026-10-06.md) ·  
[BACKLOG_FASE8_1…](./BACKLOG_FASE8_1_CATALOGO_OPERACIONAL.md) ·  
[PROMPT_MESTRE_FASE8_1…](./PROMPT_MESTRE_FASE8_1_LISTAS_PRECOS.md) ·  
[ESPECIFICACAO_FASE8_1_IMPORTACAO…](./ESPECIFICACAO_FASE8_1_IMPORTACAO_CATALOGO.md) ·  
[AUDITORIA_FASE8_1_JN…](./AUDITORIA_FASE8_1_JN_FINAL_2026-10-06.md) ·  
[AUDITORIA_F8_3…](./AUDITORIA_F8_3_UX_IMPORT_2026-10-06.md) ·  
[ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md) ·  
[ESPECIFICACAO_FASE9…](./ESPECIFICACAO_FASE9_INTEGRACOES.md) ·  
inspeção `fal-pecas/src` + `fal-pecas/supabase/migrations`.

---

## 1. Resumo executivo

O backoffice F8.1–F8.4 entregou um núcleo operacional utilizável: **listas de preços** (consulta rápida + detalhe + formação + import de venda), **classificação 3 níveis na UI**, **produtos/categorias/fabricantes/montadoras/fornecedores**, e **quatro pipelines de import** (catálogo, conversão, custo, preço). Smoke real e testes unitários da rodada F8.4 passaram.

O próximo risco de negócio não é “mais tela”: é **fechar o motor de custo da lista** (`list_extra_cost_percent`) com SQL alinhado aos callers de recalc, **sem quebrar** `resolve_product_price(s)` / checkout / estoque F7–F8, e **só então** evoluir import de classificação até folha L3 e completar filtros/massa do backlog.

**Recomendação de ordem (trilha crítica atualizada 2026-10-06):**  
F8.5 (Adicional % — **Opção A**) → Git `plan`/`dev`/`main` → init F9 → F9-A frete.  
**F8.6–F8.9 adiados** (P2/P3), fora da trilha crítica até F9-A estabilizar.

---

## 2. Estado atual

| Área | Classificação | Evidência |
|------|---------------|-----------|
| F8.4 consulta/ajuste preços | **CONCLUÍDO** | Relatório final + smoke real |
| Anti-vazamento listas | **CONCLUÍDO** | Smoke A→B→A |
| Formação UI (método/%) | **CONCLUÍDO** | `/admin/precos/:id?tab=formacao` |
| Decisão `list_extra_cost` R$ da lista | **CONCLUÍDO — Opção A** (fora do cálculo) |
| Adicional % UI | **CONCLUÍDO** (UI) / **PENDENTE** (persistência F8.5) |
| `list_extra_cost` R$ | **CONCLUÍDO** como placeholder fora do cálculo | Migration 05140000 + comments |
| Classificação UI 3 níveis | **CONCLUÍDO** | Categories + product form path |
| Seed L3 prepared | **PENDENTE** / **OPCIONAL** | `20261006160100_…` não aplicada |
| Import catálogo | **CONCLUÍDO** (MVP) / **PENDENTE** (folha L3) | F8.1-A…H; gap GRUPO→L3 |
| Import preço / custo / conversão | **CONCLUÍDO** (código) | Pages + services + RPCs |
| Filtros produtos Status/Montadora/Classificação + massa Ativar/Arquivar | **CONCLUÍDO** (parcial §7/§8) | Addendum relatório F8.4 |
| Restante §7/§8 (Marca, preço/custo, Exportar, Excluir) | **BACKLOG** | Backlog F8.1 |
| Migrations prepared `%` / L3 / M / N | **PENDENTE** | Não aplicar sem autorização |
| `resolve_product_price(s)` + `%` | **PENDENTE** (avaliar após F8.5 SQL) | Prepared diz: não altera resolve |
| F9 integrações | **BACKLOG** / planejado | Spec F9; não iniciar antes fechar F8 |
| Commit/push da rodada F8.4 | **PENDENTE** (decisão do time) | Freeze explícito |

---

## 3. Arquitetura encontrada

### 3.1 Páginas admin (rotas em `src/app/router.tsx`)

| Rota | Página | Função |
|------|--------|--------|
| `/admin` | Dashboard | Contadores / atalhos |
| `/admin/produtos` | Products list | Busca, filtros, massa Ativar/Arquivar |
| `/admin/produtos/novo` `:id` | Product form | Cadastro completo |
| `/admin/produtos/importar` | Catalog import | Import catálogo |
| `/admin/precos` | Price lists overview + quick adjust | Consulta/ajuste |
| `/admin/precos/:id` | Price list detail | Admin lista completa |
| `/admin/categorias` | Categories | Árvore L1–L3 |
| `/admin/fabricantes` | Brands | Fabricante peça |
| `/admin/montadoras` | Manufacturers | Montadora veículo |
| `/admin/veiculos` | Vehicles | Modelos/versões |
| `/admin/fornecedores` | Suppliers | CRUD |
| `/admin/fornecedores/importar-conversoes` | Conversion import | SKU fornecedor |
| `/admin/fornecedores/importar-custos` | Cost import | Custos |
| `/admin/pedidos` `:id` | Orders | Operação F7 |
| `/admin/clientes` | Customers | Consulta |
| `/admin/estoque` | Inventory | Modos F8 |
| `/admin/frete` | Shipping origin | Origem frete |
| `/admin/relatorios` | Reports | Totais básicos |

Componentes embutidos: `PriceListQuickAdjustPanel`, `PriceImportWizard`.

### 3.2 Serviços (mapa)

| Domínio | Path | Papel |
|---------|------|-------|
| Produtos | `adminProductService`, `adminImageService` | CRUD, refs, aplicações, imagens |
| Categorias | `adminCategoryService` | Árvore, depth≤3, path, subtree |
| Fabricantes | `adminBrandService` | Brands |
| Montadoras / veículos | `adminManufacturerService`, `adminVehicleService` | Makers / models / versions |
| Fornecedores | `adminSupplierService` | Suppliers |
| Preços | `adminPriceListService`, `adminPriceOverrideService`, `priceImport*` | Listas, itens, RPCs, import venda |
| Pricing puro | `pricing/pricingFormulas`, `pricing/priceResolutionService` | Fórmulas TS + RPC resolve |
| Import genérico | `services/import/*` | CSV/XLSX, kinds: catalog / conversion / cost / price_list |
| Imports domínio | `adminCatalogImportService`, `adminConversionImportService`, `adminCostImportService` | Preview/create/apply |
| Pedidos / estoque / frete / reports | `adminOrder*`, `adminInventory*`, `adminShipping*`, `adminReports*` | F7/F8/F6C |

### 3.3 RPCs / SQL de preço (núcleo)

| Símbolo | Onde vive | Uso no app |
|---------|-----------|------------|
| `product_base_cost` | SQL 05150000 | Base de custo |
| `compute_item_cost_total` | SQL 05150000; overload prepared 06160000 | Custo total item |
| `set_price_list_pricing_rule` | SQL + `adminPriceListService` | Regra da lista |
| `recalculate_price_list_items` | SQL + service | Recalc itens calculated |
| `set_price_list_item_pricing` | SQL + service | Manual / calculated item |
| `adjust_price_list_items` | SQL 04100000 + service | Ajuste massa %/R$ |
| `apply_price_list_import` | SQL 05160000 + service | Import venda |
| `resolve_product_price` / `resolve_product_prices` | SQL 04020000/04050000; TS `priceResolutionService` | Vitrine/checkout/`place_order` |

**Não alterar nesta fase de planejamento.** Qualquer mudança em resolve exige revisão de callers de pedido/estoque.

### 3.4 Testes

10 arquivos `*.test.ts` (filtros preço, overview, categorias, price import actions, fórmulas, computeCostTotal, import parser, fase81 audit/e2e). Gate recente F8.4: **70–71 PASS** + build PASS.

---

## 4. Funcionalidades concluídas (mapa explícito)

### Produtos — **CONCLUÍDO** (núcleo)

Cadastro/edição, classificação (path L3), fabricante, fornecedor, status, imagem, códigos/refs, aplicações (montadora→modelo→configuração), preços de lista **somente leitura** no form (alteração em `/admin/precos`), filtros listagem Status/Montadora/Classificação, massa Ativar/Arquivar.

### Categorias — **CONCLUÍDO** (estrutura UI)

Grupo → Categoria → Subcategoria; `parent_id`; depth hard-limit 3; busca path; criar/editar; arquivar com regras de filhos/produtos. Exclusão permanente: **não é o padrão operacional** (status).

### Preços — **CONCLUÍDO** (operacional F8.4)

| Conceito | Status |
|----------|--------|
| `pricing_method` fixed / markup_on_cost / margin_on_sell | **CONCLUÍDO** |
| `price_origin` calculated / imported / manual | **CONCLUÍDO** (separado de method) |
| Consulta rápida + detalhe + anti-vazamento | **CONCLUÍDO** |
| Adicional % persistido no banco | **PENDENTE** |

---

## 5. Pendências (classificadas)

| Item | Classe |
|------|--------|
| Aplicar `list_extra_cost_percent` + overload + atualizar callers SQL recalc/item | **BLOQUEADOR** (para F8.5 real) |
| Decisão explícita: `list_extra_cost` R$ da lista entra ou não no cálculo | **BLOQUEADOR** de alinhamento (ver §6) |
| Avaliar/alterar `resolve_product_price(s)` após F8.5 SQL | **PENDENTE** (não automático) |
| Seed L3 prepared | **OPCIONAL** |
| Import GRUPO → folha L3 | **PENDENTE** |
| Migrations prepared F8.1-M / F8.1-N (perfis / grupo-montadora) | **PENDENTE** |
| Filtros §7 restantes (Marca, com/sem preço·custo, disponível…) | **BACKLOG** |
| Exportar / Excluir permanente / selecionar todos N filtrados | **BACKLOG** (Excluir conflita com política Arquivar) |
| Label “Novo subcategoria”; foco Editar fornecedores | **BACKLOG** cosmético |
| Paginação server-side >500 itens lista | **BACKLOG** |
| Commit/push código F8.4 | **PENDENTE** (processo) |
| WMS / ERP / PIM / multi-depósito | **NÃO EVIDENCIADO** como escopo F8 imediato (spec F9 out) |

---

## 6. Adicional de custo %

### 6.1 O que a prepared pretende

Arquivo: `fal-pecas/supabase/migrations/20261006160000_list_extra_cost_percent_prepared.sql`

1. Coluna `price_lists.list_extra_cost_percent numeric(8,4) default 0`.
2. Mantém `list_extra_cost` (R$) **sem remover**.
3. Overload `compute_item_cost_total(product_id, extra_cost, price_list_id)`:
   - `base * (1 + pct/100) + item.extra_cost`
4. Assinatura antiga `(product_id, extra_cost)` permanece **sem %** (legado).
5. Comentário explícito: **não altera** `resolve_product_price(s)` nesta prepared.
6. Após apply: **revisar manualmente** callers de `recalculate_price_list_items` / `set_price_list_item_pricing` para usar overload com `price_list_id`.

### 6.2 Fluxo atual (evidência)

```text
product_base_cost(product)
  + price.extra_cost
  = custo_total (legado SQL 2-args)
→ markup / margem / fixo (pricing_method)
→ preço do item (se origin=calculated)

list_extra_cost (R$ da LISTA) = placeholder FORA do cálculo (documentado)
```

UI F8.4 já mostra Adicional % e tenta persistir; se coluna ausente → aviso gracioso.

TS `computeCostTotal` já aceita `%` (+ R$ lista se passado; callers tendem a passar 0 no R$).

### 6.3 Fluxo operacional fechado (Opção A — 2026-10-06)

```text
CUSTO (product_base_cost)
→ ADICIONAL % (list_extra_cost_percent)     → ENTRA no cálculo
→ (+ item.extra_cost)                        → ENTRA no cálculo
→ BASE / custo_total
→ MARKUP / MARGEM / FIXO (pricing_method)
→ PREÇO

list_extra_cost (R$ da LISTA) → SOMENTE INFORMATIVO (fora do cálculo)
```

### 6.4 Decisão FECHADA — Opção A (P0 resolvido)

| Campo | Entra no cálculo? |
|-------|-------------------|
| `list_extra_cost_percent` | **Sim** |
| `item.extra_cost` | **Sim** |
| `list_extra_cost` (R$ da lista) | **Não** — informativo |

**Opção B descartada** para F8.5. A prepared `20261006160000_list_extra_cost_percent_prepared.sql` está **conceitualmente alinhada**; não exige reescrever a fórmula do R$ da lista.  
Gate F8.5 segue: auditoria UI/UX → plano detalhado → inspeção SQL → implementação → testes/build → smoke → **autorização explícita** da migration → revalidação → merge `dev` → só então `main`.

**F8.6–F8.9** ficam **fora da trilha crítica** para acelerar F9 (após F8.5 + Git plan/dev/main).

### 6.5 Funções / callers a revisar

1. `compute_item_cost_total` (prepared) — apply  
2. `recalculate_price_list_items` — passar `price_list_id`  
3. `set_price_list_item_pricing` — idem  
4. Possível `set_price_list_pricing_rule` se grava `%`  
5. TS `pricingFormulas.computeCostTotal` — já preparado; validar callers UI  
6. `adminSaveListExtraCostPercent` / overview service  

### 6.6 `resolve_product_price` / `resolve_product_prices`

- **Hoje:** usados por vitrine/checkout/`place_order` via `priceResolutionService`.  
- **Prepared:** não os altera.  
- **Precisa alterar?** Só se o preço calculado persistido nas listas já refletir o novo custo **ou** se resolve recalcular custo on-the-fly.  
- **Plano:** F8.5 aplica SQL + recalc; **smoke checkout com item calculated**; se diverge, **fase dedicada** (F8.5b / gate) — não misturar no mesmo PR sem evidência.

### 6.7 Validação antes de migration

1. Diff preparado vs SQL atual em staging.  
2. Decisão R$ lista in/out documentada.  
3. Patch callers recalc em branch.  
4. Testes unitários fórmula + (ideal) SQL fixture.  
5. Smoke: item calculated muda preço após salvar % e recalc; imported/manual **não** mudam preço.  
6. Smoke checkout 1 SKU.  
7. Só então autorizar apply + commit.

---

## 7. Classificação

### 7.1 Estrutura técnica — **CONCLUÍDO**

`product_categories.parent_id` N-níveis; UI + service `CATEGORY_MAX_DEPTH = 3`; path; subtree filter; bloqueio 4º nível. **Não precisa migration de schema** para árvore.

### 7.2 Dados / catálogo — **PENDENTE / OPCIONAL**

Seed prepared cria 4 folhas sob Bandeja e Óleo de motor. Smoke já criou L3 manual (`TERMINAL LE SMOKE`). Seed **não é bloqueador** da UI; é acelerador de dados de exemplo.

### 7.3 Operações

| Operação | Estado |
|----------|--------|
| Criar L1–L3 | **CONCLUÍDO** |
| Renomear | **CONCLUÍDO** (upsert) |
| Mover (trocar pai) | **CONCLUÍDO** com validação de ciclo/depth — validar UX/smoke dedicado **PENDENTE** |
| Impedir depth 4 | **CONCLUÍDO** |
| Excluir | Política = status/arquivar; exclusão física **NÃO EVIDENCIADA** como fluxo principal |
| Deduplicação nomes | **PENDENTE** (regras de unicidade por irmãos **NÃO EVIDENCIADAS** além de slug) |
| Impacto produtos | Produto aponta `category_id` folha ou nó; filtro subtree já existe na listagem |
| Impacto import | Coluna `GRUPO` única; resolução até L3 **PENDENTE** |

Separar sempre: **estrutura técnica** (pronta) vs **dados padrão** (seed/opcional) vs **política de import** (fase própria).

---

## 8. Importação

| Pipeline | Estado | Gap principal |
|----------|--------|---------------|
| Catálogo (`CODIGO\|GRUPO\|MONTADORA\|DESCRICAO`) | **CONCLUÍDO** MVP | GRUPO → folha L3; auto-criar taxonomia tensiona spec MVP |
| Preço (venda / lista / origem) | **CONCLUÍDO** | Limites UX/smoke; não misturar com custo |
| Custo (fornecedor / supplier_products) | **CONCLUÍDO** | — |
| Conversão SKU | **CONCLUÍDO** | — |
| Perfis import DB (prepared M) | **PENDENTE** | Hoje localStorage parcial (JN) |
| Enrichment GRUPO/montadora RPC (prepared N) | **PENDENTE** | Client até apply |

**Importante:** Montadora na planilha de catálogo = sugestão; **não** cria `product_vehicle_compatibility` (spec). Filtro Montadora na listagem de produtos usa aplicações — conceitos distintos (Marca ≠ Montadora).

---

## 9. Auditoria das telas admin

| Rota | Estado | Selects/filtros | Ações | Pronta? | Próxima fase? |
|------|--------|-----------------|-------|---------|---------------|
| `/admin/produtos` | Operacional | q, Status, Montadora, Classificação, sem imagem | Editar, Arquivar, massa Ativar/Arquivar | Sim (parcial backlog) | F8.8 resto §7/§8 |
| `/admin/produtos/:id` | Operacional | Classificação path, Fab, Forn, Status, cascata veículo | Salvar, preços RO, apps, imgs | Sim | Cosmético menor |
| `/admin/categorias` | Operacional | Pai (L1–L2), busca | CRUD/status | Sim | F8.6 políticas/dados |
| `/admin/precos` | Operacional F8.4 | Lista, origem, busca | Ajuste, add SKU, configurar | Sim | F8.5 % real |
| `/admin/precos/:id` | Operacional | Lista, origem, formação, import | Recalc, manual, import | Sim | F8.5 callers |
| `/admin/fabricantes` | Operacional F8.2 | busca | Editar+foco, status | Sim | — |
| `/admin/montadoras` | Operacional F8.2 | busca | Editar+foco, status | Sim | — |
| `/admin/fornecedores` | Operacional | — | Editar **sem** scroll/foco | Quase | F8.8 UX |
| imports forn/custo/catálogo | Operacional F8.1/F8.3 | lista destino etc. | Wizard apply | Sim | F8.7 L3 |
| `/admin/pedidos*` | F7 | — | Ciclo pedido | Sim | Não reabrir em F8.x preços |
| `/admin/estoque` | F8 | modos | Ajustes | Sim | Não misturar com % |
| `/admin/clientes` `/frete` `/relatorios` `/veiculos` | Operacionais | — | — | Sim | Fora F8.5–F8.7 |

Problemas registrados (sem corrigir aqui): label gênero Subcategoria; Editar fornecedor sem foco; limite 500/50 listas; Adicional % sem coluna; possível vazio ao filtrar Montadora se produto sem aplicações.

---

## 10. Matriz de dependências

| Funcionalidade | Depende de | Impacta | Ordem |
|----------------|------------|---------|-------|
| Decisão R$ lista in/out | Contrato F8.1 D15 | Prepared `%` | 0 |
| Apply `list_extra_cost_percent` | Decisão + review callers | Formação/recalc | 1 |
| Atualizar recalc/item pricing SQL | Coluna `%` + overload | Preços calculated | 2 |
| Smoke formação + checkout | Recalc alinhado | Confiança motor | 3 |
| Avaliar resolve_product_price(s) | Evidência pós-recalc | place_order/vitrine | 4 |
| Seed L3 / catálogo padrão | Estrutura UI (já ok) | Dados import/filtros | paralelo a 1–3 se desejado |
| Import GRUPO→L3 | Taxonomia estável + política auto-create | Catálogo draft | 5 |
| Prepared M/N | Review JN | Import profiles / enrichment | 5–6 |
| Filtros §7 restantes | Nada bloqueante | UX catálogo | 6 |
| F9 gateways | F8 fechado + commits | Checkout real | depois |

Cadeia canônica Adicional %:

```text
decisão contrato R$
→ patch callers + prepared
→ testes
→ smoke formação
→ apply migration (autorizada)
→ smoke checkout
→ (só se necessário) resolve_product_price(s)
→ commit/push (autorizados)
```

---

## 11. Priorização P0–P3

### P0 — antes da próxima implementação

1. Congelar F8.4 (já feito) — não reabrir UX preços sem regressão.  
2. Decidir contrato: `list_extra_cost` R$ da lista **entra ou não** no custo_total.  
3. Protocolo: nenhuma migration sem inspeção + testes + smoke + autorização.  
4. Não tocar `place_order` / estoque / resolve sem evidência.

### P1 — sequência imediata

1. **F8.5** Adicional % (SQL + callers + validação).  
2. **F8.6** Políticas/dados classificação (seed se útil; dedup; smoke move/rename).  
3. **F8.7** Import até folha L3 (+ M/N se autorizados).

### P2 — importante depois

1. **F8.8** Completar filtros/massa backlog (Marca, preço/custo, Exportar; política Excluir).  
2. Alinhamento resolve se F8.5 revelar gap.  
3. Commit organizado do pacote F8.4+F8.5.

### P3 — backlog / cosmético

1. Label “Novo subcategoria”.  
2. UX Editar fornecedores (foco).  
3. Paginação >500.  
4. **F8.9** polimento UX listas (cards/wizard gaps da spec 8.1) se ainda fizer sentido.  
5. F9 integrações (pagamento/frete reais).

---

## 12. F8.5 — Adicional de custo (%)

### Objetivo
Persistir e calcular `list_extra_cost_percent` de ponta a ponta na **formação/recalc**, mantendo `price_origin` e `list_extra_cost` R$ conforme contrato decidido.

### Problema resolvido
UI grava “no vazio”; custo SQL legado ignora %; risco de divergência UI×banco.

### O que será alterado
- Apply (autorizado) da prepared `%` **ou** revisão dela se R$ lista entrar no cálculo.  
- Callers SQL de recalc / item pricing.  
- Possível ajuste fino UI/copy.  
- Testes fórmula + regressão calculated vs manual/imported.

### Arquivos prováveis
`20261006160000_…sql` · SQL 05150000 (callers) · `adminPriceListService.ts` · `pricingFormulas.ts` · pages formação · testes `computeCostTotal` / novos.

### Banco/RPC
`list_extra_cost_percent`; overload `compute_item_cost_total`; **não** alterar resolve no mesmo passo sem evidência.

### Testes
Unit TS; ideal fixture SQL; checklist calculated/imported/manual.

### Smoke
Salvar % → recalc → preço calculated muda; manual/imported estáveis; checkout 1 SKU.

### Aceite
Coluna presente; recalc usa %; UI sem aviso “aguarda migration”; `list_extra_cost` R$ comporta-se conforme decisão; sem regressão place_order.

### Dependências
F8.4 congelada; decisão R$ lista.

### Riscos
Caller esquecido na assinatura 2-args; checkout divergente; apply parcial.

### NÃO fazer
db push sem autorização; mudar resolve “por precaução”; alterar estoque/F7; misturar seed L3 no mesmo PR sem necessidade.

---

## 13. F8.6 — Classificação: dados e políticas

### Objetivo
Consolidar catálogo L3 operacional (seed opcional + regras de dedup/move/rename) sem mudar schema.

### Problema resolvido
Dados de exemplo inconsistentes; incerteza sobre seed vs cadastro manual; gap de smoke em mover categorias.

### Alterações
Seed prepared se autorizado; docs de política; possíveis validações de unicidade por irmãos se evidenciadas como bug.

### Banco
Só seed (`06160100`) se autorizado — sem ALTER.

### Aceite
Exemplos Bandeja/Óleo (ou equivalentes) disponíveis; depth 4 continua bloqueado; produtos existentes intactos.

### Dependências
UI L3 (F8.4). **Não** bloqueia F8.5.

### NÃO fazer
Auto-criar árvore gigante sem curadoria; 4º nível; exclusão em massa destrutiva.

---

## 14. F8.7 — Import catálogo até folha L3 (+ prepared M/N)

### Objetivo
Resolver `GRUPO` (e política de Categoria/Subcategoria) até folha utilizável; opcionalmente aplicar prepared M/N após review.

### Problema resolvido
Import classifica só parcialmente; enrichment client vs RPC diverge.

### Dependências
Taxonomia estável (F8.6 ajuda); decisão auto-create vs erro de linha (spec MVP atual = não auto-criar).

### Riscos
Criar categorias fantasma; montadora da planilha virar aplicação indevida.

### NÃO fazer
Criar `product_vehicle_compatibility` a partir da coluna MONTADORA; misturar preço/custo na grade de catálogo.

---

## 15. F8.8 — Catálogo admin (resto §7/§8)

### Objetivo
Completar filtros (Marca, com/sem preço·custo, disponível…) e ações (Exportar; definir se Excluir existe ou só Arquivar).

### Dependências
Listagem atual (parcial já entregue pós-F8.4).

### NÃO fazer
Exclusão permanente sem decisão explícita (hoje a copy da tela rejeita exclusão).

---

## 16. F8.9 — Polimento UX listas (opcional)

Gaps remanescentes da [ESPECIFICACAO_FASE8_1_LISTAS_PRECOS_UX](./ESPECIFICACAO_FASE8_1_LISTAS_PRECOS_UX.md) que **não** bloqueiam motor (cards, wizard 9 etapas, histórico UI…). Só após F8.5–F8.7 estáveis.

---

## 17. Roadmap visual

```text
F8.4 — CONCLUÍDA (consulta preços + classificação UI + freeze)
   ↓
F8.5 — Adicional % (motor SQL + callers + smoke)     [P1 / BLOQUEADOR de formação real]
   ↓
F8.5b (condicional) — resolve_product_price(s) se evidência
   ↓
F8.6 — Dados/políticas classificação L3               [P1 / paralelo possível após decisão]
   ↓
F8.7 — Import GRUPO→folha L3 (+ M/N se OK)            [P1]
   ↓
F8.8 — Filtros/massa restantes backlog                [P2]
   ↓
F8.9 — Polimento UX listas                            [P3 / OPCIONAL]
   ↓
F9 — Integrações pagamento/frete                       [após fechar F8 + commits]
```

| Fase | Objetivo | Deps | Banco | Código | Risco | Aceite-chave |
|------|----------|------|-------|--------|-------|--------------|
| F8.5 | % custo lista | F8.4 + decisão R$ | Apply prepared (+ callers) | Service/UI fino | Alto se mal aplicado | Recalc com % |
| F8.6 | Dados L3 | UI L3 | Seed opcional | Pouco | Baixo | Folhas exemplo |
| F8.7 | Import L3 | F8.6 útil | M/N opcional | Import services | Médio | GRUPO→folha |
| F8.8 | Admin catálogo | — | Não | Products page | Baixo | Filtros P1 backlog |
| F8.9 | UX listas | Motor ok | Não | Pages preços | Baixo | Spec gaps |
| F9 | Gateways | F8 fechado | Secrets | Adapters | Alto negócio | Pagamento/frete real |

---

## 18. Critérios de aceite (programa)

1. Nenhuma fase inicia sem planejamento/inspeção desta fase.  
2. Nenhuma migration sem autorização explícita pós-smoke.  
3. `pricing_method` ≠ `price_origin` preservado.  
4. Itens imported/manual não recalculam preço indevidamente.  
5. Anti-vazamento listas permanece.  
6. Depth categorias ≤ 3.  
7. Testes + build PASS a cada fase.  
8. Smoke operador com SKUs reais quando a fase toca preço/import.

---

## 19. Riscos

| Risco | Mitigação |
|-------|-----------|
| Apply `%` sem atualizar callers | Checklist SQL; testes; smoke |
| Alterar resolve cedo demais | Gate F8.5b separado |
| Confundir Marca × Montadora | Docs + filtros rotulados |
| Import auto-cria taxonomia suja | Política explícita F8.7 |
| Retrabalho UI antes do motor | Ordem F8.5 antes F8.8/F8.9 |
| Commit/push atrasado acumula drift | Pacote F8.4+F8.5 quando autorizado |

---

## 20. Explicitamente fora de escopo (agora)

- Implementar F8.5+ neste documento.  
- Qualquer `db push` / apply migration.  
- Commit/push.  
- Mudanças em F7 pedidos / F8 estoque / `place_order` sem regressão comprovada.  
- Inventar WMS/ERP/PIM.  
- Redesign cosmético priorizado sobre motor.  
- Exclusão permanente de produtos como default.

---

## 21. Protocolo de execução futura

```text
PLANEJAMENTO
→ INSPEÇÃO (somente leitura)
→ IMPLEMENTAÇÃO (código)
→ TESTES (npm test)
→ BUILD
→ SMOKE (operador / browser)
→ AUDITORIA (doc curto)
→ APROVAÇÃO HUMANA
→ MIGRATION (somente se autorizada)
→ COMMIT / PUSH (somente se autorizados)
```

Nunca pular direto para migration. Nunca aplicar “meia” migration de `%`.

---

## 22. Recomendação da ordem de execução

1. **Revisar e aprovar este plano.**  
2. **Decidir P0:** `list_extra_cost` R$ da lista entra ou não no cálculo.  
3. **Autorizar F8.5** (único próximo passo de implementação).  
4. F8.6 pode ser paralelo em dados se não conflitar com branch F8.5.  
5. Só após F8.5 estável: F8.7 import L3.  
6. F8.8/F8.9 e F9 depois.

---

## 23. Fechamento desta execução

Documento criado: `docs/planejamento/PLANO_MESTRE_F8_PROXIMAS_FASES_2026-10-06.md`.

**Nenhuma outra alteração.**  
**Nenhuma fase implementada.**  
**PARAR.**
