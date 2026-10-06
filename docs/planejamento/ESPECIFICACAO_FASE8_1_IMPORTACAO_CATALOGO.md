# Especificação — Fase 8.1: Catálogo comercial + fornecedores + custos + listas de preço

**Status:** Spec aprovada. **F8.1-A…H DONE** (H = E2E/regressão local; smoke remoto pendente apply migrations).  
**Data:** 2026-10-04 (rev. 2026-10-05)  
**Branch:** `plan`  
**Tipo:** Especificação + execução fatia a fatia  
**Fontes:** PRD 3.0 · IMPORT.md · DATABASE.md · AUDITORIA_GERAL_PRD_VS_SITUACAO · F6B · F8 Fatia A · prompt mestre F8 · schema remoto `wtbpwuiayednvlhvuhbh`

---

## 1. Objetivo

Estruturar a operação comercial da FAL em quatro blocos separados e importáveis de forma controlada:

1. **Catálogo** — produto FAL (`products.sku`)  
2. **Fornecedores** — entidade + **conversão** código fornecedor → SKU FAL  
3. **Custos** — custo **por fornecedor×produto**  
4. **Preços** — listas de venda com regra, origem e importação  

Fechar o gap MVP do PRD (RF12) sem misturar estoque físico, sem auto-publicar e sem reimplementar 6B do zero.

## 2. Contexto

- F1 → F8 Fatia A tecnicamente fechadas.  
- Loja em `inventory_mode = sem_estoque` (decisão comercial).  
- Catálogo real ainda seed (poucos SKUs publicados).  
- Import de preços por lista (6B) existe; import de catálogo/conversão/custo **não**.

## 3. Estado atual (auditoria 2026-10-04)

| Item | Valor remoto |
|------|--------------|
| Modo loja | `sem_estoque` |
| Products | 34 (2 published) |
| Suppliers | 1 |
| `supplier_products` | **0** (sem conversões/custos cadastrados) |
| Price lists | 2 |
| Price list items | 35 |
| Imports | 0 |

## 4. Diagnóstico

### 4.1 Já existe

| Bloco | Realidade |
|-------|-----------|
| Produtos | `sku` UNIQUE, `status` draft/published/archived, `is_available`, `is_incomplete` (sem imagem), `price` NOT NULL, FKs marca/categoria |
| Fornecedores | `suppliers` + UI CRUD `/admin/fornecedores` |
| Vínculo | `supplier_products` (`supplier_sku`, `cost`) UNIQUE(`supplier_id`,`product_id`) |
| Listas | F6B `price_lists` / `price_list_items` / `price_change_history` + import SKU;PRECO em `/admin/precos/:id` |
| Pipeline | `imports` / `import_items` + `kind` + `price_list_id` |
| Estoque | Modos F8; separado do catálogo |

### 4.2 Lacunas

- Sem import de cadastro de produtos.  
- Sem UI/import de conversões; **sem** UNIQUE(`supplier_id`,`supplier_sku`) para lookup.  
- Sem fluxo de import/gestão de custo (campo `cost` ocioso).  
- Listas sem regra padrão (margem/markup/base/arredondamento).  
- Itens sem origem operacional completa (`calculated` / `imported` / `manual`) — history só `manual|import|system`.  
- Sem recalcular / voltar à regra / exceção por margem.  
- Arquivo real FAL **não disponível** no repositório.  
- Permissões de import hoje = qualquer `is_staff()` (6B) — largo demais para F8.1.

## 5. Decisões de produto (fixadas nesta spec)

| # | Decisão |
|---|----------|
| D1 | Upsert de produto por **`products.sku`** |
| D2 | Import **não** publica (`status` novo = `draft`) e **não** seta `is_available=true` |
| D3 | Célula vazia no arquivo = **preservar** valor existente |
| D4 | Custo é **por fornecedor×produto** (`supplier_products`), não campo único em `products` |
| D5 | Reutilizar `price_lists` / `price_list_items` — **não** criar estrutura paralela |
| D6 | Margem sobre venda ≠ markup sobre custo — fórmulas explícitas |
| D7 | Origens de preço: `calculated` \| `imported` \| `manual` |
| D8 | Mudança de custo recalcula só itens `calculated` |
| D9 | Match **exato** (SKU / supplier_sku); sem fuzzy/IA |
| D10 | Sem coluna de estoque em qualquer import F8.1 |
| D11 | CSV UTF-8, delimitador `;`; XLSX = mesma grade |
| D12 | Confirmação aplica **só linhas válidas**; apply preferencialmente via **RPC transacional** |
| D13 | Importar/confirmar: **administrador + gerente** |
| D14 | Template provisório até validar arquivo real FAL |
| D15 | Custo preparado: `custo_total = custo_base + custo_adicional_item` (+ `custo_adicional_da_lista` futuro no schema, sem rateio agora) |
| D16 | Origem anti-circular: `calculated` = custo+regra→preço; `imported`/`manual` = preço é fonte; % efetivos são consequência; custo **não** recalcula imported/manual |
| D17 | Conversão upsert por `(fornecedor, supplier_sku)` — reimport não duplica; SKU FAL inexistente = erro; sem auto-criar produto |
| D18 | Importação ≠ publicação ≠ disponibilidade comercial |

## 6. Conceitos fundamentais

```text
CATÁLOGO (Produto FAL / sku)
    → FORNECEDOR
    → CONVERSÃO (supplier_sku → sku)
    → CUSTO (por relacionamento)
    → REGRA DE PREÇO (lista)
    → PREÇO DE VENDA (item da lista)
    → is_available (comercial)
    → VENDA
```

Não misturar:

| Conceito | Significado |
|----------|-------------|
| `status` | Visibilidade no catálogo (draft/published/archived) |
| `is_available` | Disponibilidade **comercial** |
| `quantity_*` | Estoque físico |
| `inventory_mode` | Modo da loja |
| `supplier_products.cost` | Custo daquele fornecedor |
| `price_list_items.price` | Preço de venda na lista |

## 7. Catálogo

Catálogo ≠ produto vendável. Pode existir:

- cadastrado (`draft`)  
- publicado sem disponível  
- publicado + disponível em `sem_estoque` sem qty física  

## 8. Produtos — modelo atual

| Campo | Obrig. DB | Importável MVP | Protegido |
|-------|-----------|----------------|-----------|
| `id` | sim | não | sim |
| `sku` | sim UNIQUE | sim (chave) | identidade |
| `name` | sim | sim | não |
| `slug` | sim UNIQUE | opcional (auto) | não |
| `description` / `short_description` | não | opcional | não |
| `brand_id` / `category_id` | não | via nome/slug | não |
| `price` | sim NOT NULL | opcional no CSV mínimo; default **0** na criação | não zerar no update se coluna ausente |
| `promo_price` | não | opcional | não |
| `status` | sim | **omitir no CSV MVP** | publicação só UI |
| `is_available` | sim default false | **omitir / não auto-true** | decisão operacional |
| `is_incomplete` | sim | derivado (imagens) | não setar manual no import |
| `manufacturer_code` | não | opcional | não |
| `supplier_id` | não | opcional (fornecedor “principal”) | não substitui conversões |
| `attrs`, dims, SEO | não | fora Fatia B | — |
| `created_at` / `updated_at` | sim | não | sim |

**Não existe** `is_published`.

## 9. Fornecedores — modelo atual

`suppliers`: `id`, `name`, `code` UNIQUE nullable, `status` active/inactive, `created_at`.  
UI: `/admin/fornecedores` (CRUD).  

**Proposto (sem implementar agora):** `updated_at`, `notes` opcional — só se necessário na Fatia C.

## 10. Conversões

Persistir em `supplier_products`:

- `supplier_id` + `product_id` (já UNIQUE)  
- `supplier_sku` = código do fornecedor  

**Proposto:** índice UNIQUE parcial `(supplier_id, supplier_sku) WHERE supplier_sku IS NOT NULL` para lookup seguro.

Regras (D17):

- Fornecedor + código fornecedor → **no máximo um** produto FAL.  
- SKU FAL inexistente → **erro**; **não** auto-criar produto.  
- Se `(fornecedor, supplier_sku)` já existir → **atualizar** associação (`product_id`); **nunca** duplicar.  
- Reimportar a mesma planilha = idempotente.

## 11. Custos

- Custo base por relacionamento: `supplier_products.cost` (`custo_base`).  
- **Fonte na formação F8.1-E:** `supplier_products.cost` onde `supplier_id = products.supplier_id` (fornecedor principal). **Sem** lowest-cost / prioridade inventada.  
- **D15:** `custo_total = custo_base + price_list_items.extra_cost`. `price_lists.list_extra_cost` = **placeholder** (fora do cálculo até rateio definido).  
- Histórico completo de custo: **futuro**; MVP audita via `imports`/`import_items`.

## 12. Listas de preço — modelo atual (6B)

`price_lists`: name, slug, description, status draft/active/inactive, scope public/assigned, priority, valid_from/until, is_default.  
`price_list_items`: price_list_id, product_id, price.  
`price_change_history`: old/new, source manual|import|system, import_id.

**Ausente:** método, margem/markup, base, arredondamento, origem no item, preço calculado, override.

## 13–16. Formação de preço (modelo proposto)

### Métodos

| Método | Fórmula (custo C, perc p) | Ex. C=100, p=40 |
|--------|---------------------------|-----------------|
| `markup_on_cost` | `C * (1 + p/100)` | 140,00 |
| `margin_on_sell` | `C / (1 - p/100)` | 166,67 |
| `fixed` | preço informado | — |

UI deve rotular claramente **Margem sobre venda** vs **Acréscimo/markup sobre custo**.

### Regra padrão da lista (campos propostos)

- `pricing_method`  
- `pricing_percent`  
- `cost_source` = `supplier_product` (MVP)  
- `rounding_mode` = `two_decimals` (MVP; outras regras futuras)

### Item (campos propostos)

- `price` = preço **final** (já existe)  
- `calculated_price` nullable  
- `price_origin` = `calculated` \| `imported` \| `manual`  
- `override_method` / `override_percent` nullable (exceção)

### Comportamento (D16 — sem circularidade)

- Import de venda → `price_origin=imported`; preço é a **fonte**; regra padrão da lista **permanece**.  
- Preço editado na UI → `price_origin=manual`.  
- “Voltar à regra padrão” (ação explícita) → recalcula e `origin=calculated`.  
- Mudança de custo / regra → **só** recalcula `origin=calculated`.  
- Em `imported`/`manual`: % margem e markup **efetivos** são consequência exibida, nunca alimentam o preço de volta.  
- Nunca fórmula circular (preço → custo → mesmo preço).  
- Sem custo → não calcula; permite importado/manual; flag “Sem custo”.  
- UI deve exibir: **Custo | Preço de venda | Margem % | Markup % | Origem** (50% markup ≠ 50% margem).

## 17. Exceções por produto

MVP: regra padrão da lista + exceção por item (margem/markup/fixo).  
Custo adicional de lista: schema preparado (D15); UI/rateio = futuro.  
Fora: regras por categoria/marca/cliente/região.

## 18–22. Quatro importações

### A) Cadastro de produtos — `kind=catalog`

```text
codigo_fal;descricao
FAL001;Pivô Palio
```

Colunas opcionais: `marca`, `categoria`, `manufacturer_code`, `descricao_longa`, `preco` (legado/espelho).  
**Proibido:** stock/qty, is_available, status=published.

Defaults criação: `status=draft`, `is_available=false`, `price=0` se coluna ausente, slug do nome.

### B) Conversões — `kind=supplier_conversion`

UI seleciona fornecedor + arquivo:

```text
codigo_fal;codigo_fornecedor
FAL001;ABC123
```

### C) Custos — `kind=supplier_cost`

UI seleciona fornecedor + arquivo:

```text
codigo_fornecedor;custo
ABC123;52,50
```

Resolve conversão → atualiza `cost`. Sem conversão → **pendência** (selecionar produto FAL e salvar conversão).

### D) Lista de venda — `kind=price_list` (evoluir 6B)

UI seleciona lista + arquivo:

```text
codigo_fal;preco
FAL001;89,90
```

Marca origem `imported`. Não apaga regra padrão.

### Futuro (só registrar)

- Compatibilidade veicular estruturada.  
- Import de estoque (fase própria).

## 23–25. Formato CSV / XLSX / Template

| Regra | Valor |
|-------|--------|
| Extensões | `.csv`, `.xlsx` (`.xls` opcional se parser 6B cobrir) |
| Encoding | UTF-8 (BOM opcional) |
| Delimitador CSV | `;` |
| Decimal | BR (`52,50`) via `parseMoneyBr` |
| Cabeçalho | obrigatório; nomes canônicos case-insensitive |
| Linha vazia | ignorar |
| Espaços | trim |
| Coluna desconhecida | **aviso** (não bloqueia lote) |
| Célula vazia em update | preservar |
| Limite MVP | **2.000** linhas/arquivo |
| Preview UI | ~50 linhas/página |

### Template catálogo (mínimo)

| Coluna | Obrig. | Tipo | Exemplo |
|--------|--------|------|---------|
| codigo_fal | sim | text | FAL001 |
| descricao | sim (criação) | text | Pivô Palio |

### Template conversão

| Coluna | Obrig. |
|--------|--------|
| codigo_fal | sim |
| codigo_fornecedor | sim |

### Template custo

| Coluna | Obrig. |
|--------|--------|
| codigo_fornecedor | sim |
| custo | sim ≥ 0 |

### Template venda

| Coluna | Obrig. |
|--------|--------|
| codigo_fal | sim |
| preco | sim ≥ 0 |

## 26. Validação

| Severidade | Exemplos |
|------------|----------|
| **Erro** | SKU vazio/inválido/duplicado no arquivo; preço/custo inválido; SKU inexistente (conversão/venda); supplier_sku sem conversão (custo); conflito de conversão; produto archived em operação que exigiria reativação automática |
| **Aviso** | descrição curta; marca/categoria ausente; coluna desconhecida; produto sem imagem (`is_incomplete`) |
| **OK** | linha aplicável |

Marca/categoria inexistente no MVP: **erro de linha** (não auto-criar taxonomia).

Arquivado: **não reativar** automaticamente; erro ou skip com mensagem explícita.

## 27. Preview

Pipeline:

```text
Upload → Validação → Preview → Confirmação → Processamento → Resultado
```

Preview **não** altera `products` / `supplier_products` / `price_list_items`.  
Pode persistir lote em `imports` (`status=preview`) + `import_items` (como 6B).

Colunas tipicas: Linha · Chaves · Operação (NOVO/ATUALIZAÇÃO) · Status · Problema · Valores atuais→novos.

## 28. Confirmação

Confirmação inline (padrão F7/F8 — sem `window.confirm`).  
Mostrar totais: novas, atualizações, erros, avisos, impacto.

## 29. Atomicidade

- Arquivo pode ter linhas inválidas.  
- Confirmação aplica **somente válidas**.  
- Apply do conjunto confirmado: **uma RPC/transação** (melhoria vs loop cliente 6B).  
- Falha da transação → lote `failed`; nada parcial inconsistente no domínio.

## 30–31. Auditoria e histórico

Reutilizar `imports` / `import_items`.

Kinds: `catalog` | `supplier_conversion` | `supplier_cost` | `price_list` | `generic`.

`imports.report` sugerido:

```json
{
  "total": 0, "valid": 0, "invalid": 0, "warnings": 0,
  "created": 0, "updated": 0, "skipped": 0, "applied": 0, "failed": 0,
  "supplier_id": null, "price_list_id": null
}
```

Proposto: `imports.supplier_id` nullable (simétrico a `price_list_id`).

Eventos auditáveis (MVP via import + history preços; resto futuro): produto criado/atualizado; conversão; custo; preço importado/manual; recalculo; lote.

## 32. Permissões

Roles atuais: `administrador`, `gerente`, `operador`, `estoque`, `atendimento` (+ customer).

| Ação | Quem |
|------|------|
| Ver produtos/listas/fornecedores | staff (como hoje) |
| Importar/confirmar catálogo, conversão, custo, venda | **administrador, gerente** |
| Editar regra da lista / recalcular | administrador, gerente |
| Ajuste pontual de preço (já 6B) | restringir gradualmente a admin/gerente (hoje qualquer staff — gap a fechar) |
| `atendimento` / `estoque` | sem novos poderes F8.1 de import |

## 33. Segurança

- Validação crítica no **backend** (RPC), não só browser.  
- Revogar EXECUTE anon em RPCs novas (higiene já flagada na auditoria geral).  
- Tipos MIME/extensão; tamanho máximo (ex. 5 MB MVP).  
- CSV: tratar células que começam com `=`, `+`, `-`, `@` (formula injection) — prefixar/escapar no export; rejeitar ou sanitizar no import.  
- Sem UPDATE direto de domínio pelo cliente no apply — RPC security definer com checagem de role.

## 34–41. Telas

### `/admin/produtos` (existe)
Filtros MVP: busca, status, is_available, incompleto, marca, categoria. Ação: **Importar**.

### `/admin/produtos/importar` (nova)
Etapas: arquivo → validar → preview → confirmar → resultado. Template download.

### `/admin/fornecedores` (existe)
Manter CRUD; link **Conversões** / Importar conversões.

### `/admin/fornecedores/:id/conversoes` (nova)
Tabela: código fornecedor · SKU FAL · produto · custo · atualizado. Ações: nova, editar, importar conversão, importar custo (atalho).

### `/admin/precos` (existe — enriquecer)
Nome · status · regra (quando existir) · qtd itens · última atualização · ações.

### `/admin/precos/:id` (existe — evoluir)
Cabeçalho + regra padrão + resumo (precificados / sem custo / sem preço / calculados / importados / manuais) + tabela + filtros + ações em massa com preview + import venda (já parcialmente lá) + recalcular.

### `/admin/precos/importar-custo` (nova)
Fornecedor → arquivo → preview (código forn. · SKU · custo atual · novo · situação) → confirmar.

### Import venda
**Preferência:** evoluir bloco em `/admin/precos/:id` (evitar rota duplicada). Rota dedicada só se UX exigir.

### UX comum
Confirmações **inline**; loading; empty states; erros reais; mobile: colunas prioritárias + scroll horizontal / detalhe.

## 42. Responsividade

Desktop-first admin. Mobile: busca + status + ações principais; tabelas com scroll; painel de detalhe para edição.

## 43–45. Catálogo público / is_available / status / sem_estoque

- Busca/RLS: `status=published`.  
- Venda: `place_order` exige published + `is_available`.  
- Em `sem_estoque`, qty física **não** bloqueia.  
- Import F8.1 **não** altera inventory nem força `is_available`.

## 46–47. Checkout e pedidos

- Nenhuma importação altera `orders` / snapshots.  
- Preço no pedido continua snapshot no `place_order`.  
- Regressão obrigatória: checkout, F7, F8 modos.

## 48. Relação com 6B

| Reutilizar | Adaptar | Não duplicar |
|------------|---------|--------------|
| `imports`/`import_items`, statuses, report | kinds novos; `supplier_id` | segunda tabela de preços |
| `parseMoneyBr`, xlsx | parsers multi-coluna | `priceImportParser` 2 colunas como único parser |
| UI preview→confirm | RPC apply; roles mais restritas | segundo fluxo de venda paralelo |
| `price_change_history` | estender sources/origens | history paralelo |

## 49. Modelo de dados atual (resumo)

Ver §8–12. Constraints chave:

- `products_sku_key`, `products_slug_key`  
- `supplier_products_supplier_id_product_id_key`  
- **falta** unique supplier_sku por fornecedor  
- `price_list_items` unique (list, product)

## 50. Modelo de dados proposto (implementação futura)

1. UNIQUE parcial `(supplier_id, supplier_sku)`  
2. `imports.supplier_id` nullable  
3. Em `price_lists`: `pricing_method`, `pricing_percent`, `rounding_mode`  
4. Em `price_list_items`: `calculated_price`, `price_origin`, overrides  
5. Opcional futuro: `supplier_cost_history`  
6. Sem novas tabelas de preço paralelas

## 51. RPC / RLS futuros

| RPC (nome sugerido) | Papel |
|---------------------|--------|
| `preview_catalog_import` / `apply_catalog_import` | lote produtos |
| `preview_supplier_conversion_import` / `apply_…` | conversões |
| `preview_supplier_cost_import` / `apply_…` | custos |
| `apply_price_list_import` (evoluir 6B) | venda com origem |
| `recalculate_price_list_items` | só calculated; com preview client |

RLS: manter staff; enforce role admin/gerente **dentro** das RPCs. Revogar anon execute.

## 52–53. Testes e E2E

**Unit:** parsers, normalização, duplicidade SKU, dinheiro BR, margem vs markup.  
**DB:** constraints, upsert, unique conversão, RLS/RPC.  
**E2E por kind:** upload→preview (DB domínio intacto)→confirm→resultado.  
**Regressão:** busca, PDP, carrinho, checkout, pedido F7, modos F8, import preço 6B.

## 54. Critérios de aceite (propostos)

1. CSV catálogo válido cria produtos `draft` + `is_available=false`.  
2. SKU existente atualiza campos presentes; vazio preserva.  
3. SKU duplicado no arquivo = erro.  
4. Preview não altera domínio.  
5. Conversão fornecedor+código → SKU; conflito detectado.  
6. Custo resolve via conversão; sem conversão = pendência.  
7. Lista com regra: markup/margem matematicamente corretos.  
8. Preço importado ≠ calculado ≠ manual.  
9. Mudança de custo não sobrescreve imported/manual.  
10. Import não publica / não seta available / não toca inventory.  
11. Lote auditável em `imports`.  
12. Pedidos/checkout/F7/F8 intactos.

## 55. Riscos

Estrutura de preço duplicada · margem≠markup confundidos · custo mal modelado · import sobrescrever manual · auto-publicar · códigos sem conversão · perda de histórico · arquivo real desconhecido · escala/timeout · grants anon · concorrência de lotes · arredondamento · produto archived · preço sem custo · recalculo silencioso.

## 56. Dependências

1. **Arquivo real de origem da FAL não está disponível nesta etapa.** Template provisório derivado do schema; validar contra arquivo real antes de implementar.  
2. Aprovação humana desta spec.  
3. Decisão de arredondamento comercial além de 2 casas (se necessário).  
4. Qual custo usar quando há vários fornecedores (MVP: o da importação / vínculo editado).

## 57. Fatias futuras de implementação

| Fatia | Objetivo | Gate |
|-------|----------|------|
| **F8.1-A** | Contratos CSV, parsers compartilhados, kinds, validação, fórmulas preço (pure) | **DONE 2026-10-05** — 20 testes unit + build OK |
| **F8.1-B** | Import cadastro + `/admin/produtos/importar` + apply RPC | **DONE 2026-10-05** — migration `20261005120000_fase81b_catalog_import.sql` |
| **F8.1-C** | Conversões UI + import + UNIQUE supplier_sku + upsert D17 | **DONE 2026-10-05** — migration `20261005130000_fase81c_supplier_conversions.sql` |
| **F8.1-D** | Import/gestão custos + `extra_cost` item + placeholder lista | **DONE 2026-10-05** — migration `20261005140000_fase81d_supplier_costs.sql` |
| **F8.1-E** | Extensão listas: regra, margem/markup, origem D16, UI % | **DONE 2026-10-05** — migration `20261005150000_fase81e_pricing_formation.sql` |
| **F8.1-F** | Import venda com origem (evoluir 6B) | **DONE 2026-10-05** — migration `20261005160000_fase81f_price_list_import_rpc.sql` |
| **F8.1-G** | UX detalhe lista, filtros, ações em massa com preview | **DONE 2026-10-05** — indicadores, filtros/sort, export CSV, origem explícita |
| **F8.1-H** | Auditoria, E2E, regressão F7/F8/checkout | **DONE 2026-10-05** — Vitest cadeia+migrations; ver `GATE_FASE8_1_H_E2E_REGRESSAO.md` |

Cada fatia, na implementação: arquivos · migration · RPC · UI · testes · aceite · sem push sem autorização.

## 58. Fora do escopo

WMS · multi-depósito · lote · barcode · FIFO · custo médio contábil · compras · NF · ERP · PIM · CRM · pricing por cliente/região/canal · fuzzy/IA · import compatibilidade · import estoque · Balanço · F9 · F10 · implementação nesta etapa.

## 59. Questões em aberto (não bloqueiam a spec)

1. Arquivo real FAL — layout definitivo.  
2. Arredondamento comercial (0,05 / 0,10 / psicológico).  
3. Se `products.price` legado continua espelhando lista default após formação por regra.  
4. Restringir imediatamente escrita 6B a admin/gerente ou só nas RPCs novas.  
5. Job assíncrono acima de 2.000 linhas (pós-MVP).

## 60. Gate de implementação

**F8.1-A…H entregues (local).**  
**F8.1-H:** simulador E2E + auditoria migrations B–F + regressão estática F7/F8/checkout. Doc: `GATE_FASE8_1_H_E2E_REGRESSAO.md`.  
**Migrations remotas pendentes:** fase81b…f (bloqueiam smoke live).  
**Não feito:** commit/push.

---

## Apêndice A — Checklist “preparado para venda” (visão derivada)

**D18:** Importação ≠ publicação ≠ disponibilidade — ter cadastro/custo/preço **não** torna vendável.  
Não é novo status nem motor obrigatório nesta fase. Indicadores futuros:

| Check | Fonte |
|-------|--------|
| Código | `sku` |
| Nome | `name` |
| Categoria / marca | FKs (recomendado) |
| Preço válido na lista ativa | `price_list_items.price` > 0 |
| Imagem | `is_incomplete = false` |
| Publicado | `status = published` |
| Disponível | `is_available = true` |
| Aplicação | futuro (compat) |
| Estoque físico | **não exigido** em `sem_estoque` |

## Apêndice B — Supersessões a IMPORT.md

- Delimitador padrão: **`;`** (fecha decisão pendente).  
- Coluna `stock` / movimento de estoque na importação de catálogo: **proibida** na F8.1.  
- Auto-criar categoria/marca: **não** no MVP.  
- Limite linhas: **2.000**.  
- Apply: **RPC síncrona** no MVP; assíncrono futuro.
