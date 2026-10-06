# Especificação — Fase 8.1: UX operacional de Listas de Preços

**Status:** Spec de design — documentação. Implementação só após inspeção + autorização Gate F8.1-I.  
**Data:** 2026-10-06  
**Branch:** `plan`  
**Tipo:** Evolução de UX/operação sobre o motor F6B + F8.1-E/F existente  
**Fontes:** Plano mestre F8.1 · ESPECIFICACAO_FASE8_1_IMPORTACAO_CATALOGO.md · ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md · código atual em `fal-pecas/src/pages/admin/prices/`

**Documentos irmãos (não duplicar):**

- [BACKLOG_FASE8_1_CATALOGO_OPERACIONAL.md](./BACKLOG_FASE8_1_CATALOGO_OPERACIONAL.md) — catálogo, layout 4 colunas, P0–P3  
- [PROMPT_MESTRE_FASE8_1_LISTAS_PRECOS.md](./PROMPT_MESTRE_FASE8_1_LISTAS_PRECOS.md) — contrato para o Agent  

---

## 1. Objetivo

Transformar o módulo administrativo de listas de preços em ferramenta operacional completa para a FAL, **sem recriar** o motor de preços.

```text
LISTAS DE PREÇOS
        │
        ├── criar lista
        ├── editar lista
        ├── ativar/inativar
        ├── excluir
        ├── configurar formação
        │
        └── abrir lista
              │
              ├── visão geral
              ├── produtos
              ├── filtros
              ├── edição
              ├── ações em massa
              ├── importar preços
              ├── exportar
              └── histórico
```

### Fora de escopo desta spec

- Recriar `price_lists` / `price_list_items`
- Importação de catálogo (ver backlog)
- Códigos de fornecedor / conversões
- Compatibilidade veicular
- Alterar `place_order`, F7/F8, estoque
- `db push` / `repair` / `fetch` / commit / push

---

## 2. Princípio fundamental

Antes de qualquer alteração de código:

1. Inspecionar banco  
2. Inspecionar migrations  
3. Inspecionar RPCs  
4. Inspecionar services  
5. Inspecionar páginas  
6. Inspecionar rotas  
7. Inspecionar testes  
8. Identificar o que já existe  
9. Listar gaps  
10. Só então propor alterações  

Reutilizar: `products`, `price_lists`, `price_list_items`, `imports` / `import_items`, `supplier_products`, `price_change_history`.

---

## 3. Estado atual vs alvo (mapa de impacto)

### 3.1 Já existe

| Área | Arquivo / artefato | O que funciona |
|------|--------------------|----------------|
| Listagem | `AdminPriceListsPage.tsx` | Tabela + form criar/editar |
| Detalhe | `AdminPriceListDetailPage.tsx` | Página longa: stats, regra, import, filtros, linha a linha |
| Service | `adminPriceListService.ts` | CRUD, stats, regra, recalc, import preview/apply, ajuste global, export CSV filtrado |
| Import | `contracts.ts` kind `price_list` | SKU + preço; aliases; max 2.000 linhas; CSV/XLSX |
| Origem | `price_origin` | `calculated` \| `imported` \| `manual` |
| RPCs | migrations F8.1-E/F | `set_price_list_pricing_rule`, `recalculate_price_list_items`, `set_price_list_item_pricing`, `adjust_price_list_items`, `apply_price_list_import` |
| Histórico DB | `price_change_history` + `imports` | Persistido; **sem UI** |
| Rotas | `/admin/precos`, `/admin/precos/:id` | Sem rota dedicada de import |

### 3.2 Gaps (alvo desta spec)

| Desejado | Atual |
|----------|--------|
| Cards de indicadores na home | Só tabela |
| Abas no detalhe | Scroll único |
| Wizard import 9 etapas | Upload → preview → confirm (~3 passos) |
| Perfis de mapeamento | Aliases fixos; sem perfil salvo |
| Seleção em massa na grade | Ausente |
| Histórico / auditoria UI | Zero listagem admin |
| Excluir / duplicar lista | Sem botões |
| Progresso real no apply | UX limitada |
| Paginação / seleção de todos os resultados | Limit 500 client-side |
| Filtro “Lista” vazio = todas | Só dentro de uma lista |

---

## 4. Navegação — `/admin/precos`

### 4.1 Topo

```text
Listas de preços

Gerencie suas listas comerciais e regras de formação de preço.

[ + Nova lista ] [ Importar preços ]
```

### 4.2 Cards de indicadores

| Card | Métrica |
|------|---------|
| LISTAS ATIVAS | Count `price_lists` com status ativo |
| TOTAL DE ITENS | Soma itens em listas (ou escopo definido na implementação) |
| COM PREÇO | Itens com preço > 0 |
| SEM PREÇO | Itens sem preço / preço zero (conforme regra de produto) |

### 4.3 Tabela de listas

| Coluna | Fonte |
|--------|--------|
| Lista | `name` |
| Status | Ativa / Inativa / Draft (mapear status atual) |
| Método | `pricing_method` (Margem / Markup / Fixo / Importado) |
| Regra | `%` ou fator, ou “—” se fixo/importado |
| Itens | Count itens |
| Com preço | Count com preço |
| Atualizada | `updated_at` relativo ou data |
| Ações | Abrir · Editar · Duplicar · Ativar/Inativar · Excluir |

**Excluir** exige confirmação destrutiva.

**Criar / editar lista** (modal ou página):

- Nome *  
- Descrição  
- Status  

Formação:

```text
○ Preço importado/manual
○ Markup sobre custo      → Markup (ex.: 1,50 ou %)
○ Margem sobre venda      → Margem (ex.: 35%)
○ Preço fixo
```

Métodos canônicos já existentes: `markup_on_cost`, `margin_on_sell`, `fixed`.

---

## 5. Dentro da lista — `/admin/precos/:id`

```text
← Listas de preços

VAREJO
Ativa

[Editar lista] [Importar preços] [Exportar]

Regra atual:
Margem sobre venda — 35%

[Produtos] [Formação de preço] [Importações] [Configuração]
```

### 5.1 Aba Produtos (principal)

**Filtros:**

| Filtro | Comportamento |
|--------|----------------|
| Lista | Selecionada = só aquela lista; **vazia** = consultar produtos de todas as listas |
| Buscar | Código / descrição |
| Status | Todos / … |
| Preço | Todos / com / sem |
| Origem | Todas / calculated / imported / manual |
| Custo | Todos / com / sem |
| Marca | Todas / … |
| Categoria | Todas / … |
| Filtrar / Limpar | — |

**Tabela:**

```text
☐ | Código | Produto | Custo | Preço | Origem | Margem | Atualizado
```

Custo continua vindo de `supplier_products` (fornecedor principal), sem estrutura paralela.

### 5.2 Edição manual de preço

Clique no preço → input + Salvar:

- Atualiza preço  
- Origem → `manual`  
- Confirmação visual  
- Preserva filtros e posição/scroll  

### 5.3 Voltar ao cálculo

Se origem = `manual` (ou override explícito):

> O preço manual será substituído pelo valor calculado pela regra atual.

Após confirmação → origem `calculated`.

### 5.4 Seleção em massa (Gate L)

```text
☐ Selecionar todos (página)
N selecionados
[Recalcular] [Exportar] [Alterar preço] [Remover da lista]
```

Com paginação:

```text
Selecionar página
Selecionar todos os N resultados
```

Não limitar a seleção ao que está visualmente na página.

### 5.5 Aba Formação de preço

Reutilizar UI/RPC já existentes de regra + recalc (só `calculated`, salvo ação explícita).

### 5.6 Aba Importações (histórico — Gate M)

| Data | Arquivo | Perfil | Linhas | Atualizados | Erros | Operador |
|------|---------|--------|-------:|------------:|------:|----------|

Abrir detalhe: resumo, arquivo, configuração, mapeamento, resultado, erros, não encontrados.  
Fonte: `imports` / `import_items` (`kind = price_list`).

### 5.7 Aba Configuração

Metadados da lista (nome, status, escopo, vigência, default) — evoluir o form atual sem duplicar entidade.

---

## 6. Wizard de importação de preços (9 etapas)

Botão **Importar preços** (home ou detalhe) abre wizard.  
Lista destino **obrigatória** (pré-preenchida se vier do detalhe).

| # | Etapa | Conteúdo |
|---|--------|----------|
| 1 | Arquivo | Drag/drop ou selecionar; CSV/XLSX; até 2.000 linhas |
| 2 | Destino | Lista de destino * |
| 3 | Modo | Ver §6.1 |
| 4 | Mapeamento | Auto-detect + override Código / Preço |
| — | Perfil | Salvar / reutilizar perfil (ex.: “HF — Lista de preços”) |
| 5 | Regras | Não encontrado = ignorar + relatório (**nunca** criar produto); preço zero permitir/bloquear (default: bloquear inválidos) |
| 6 | Prévia | Contagens + tabela de ações; **nada grava** |
| 7 | Confirmação | Resumo numérico |
| 8 | Processamento | Progresso **real** se disponível; senão contador sem % inventado; “Não feche esta tela” |
| 9 | Resultado | Atualizados / adicionados / sem alteração / não encontrados + exportar relatório |

### 6.1 Modos de importação

```text
○ Atualizar preços existentes
○ Criar itens ausentes na lista
○ Atualizar + criar ausentes
○ Apenas simular
```

**“Criar ausentes”** = adicionar produto **já existente** em `products` à lista.  
SKU inexistente → **não** cria produto → relatório “produto não encontrado”.

### 6.2 Prévia — colunas

| Código | Produto | Preço atual | Novo preço | Ação |
|--------|---------|------------:|-----------:|------|
| … | … | … | … | Atualizar / Adicionar / Sem alteração / Não encontrado / Erro |

### 6.3 Perfis de importação

Após mapeamento:

```text
Salvar como perfil
Nome: [HF — Lista de preços]
```

Próxima importação: detectar perfil quando cabeçalho bater → Usar perfil / Configurar manualmente.

### 6.4 Regras invioláveis do import de preço

1. Nada grava antes da confirmação (exceto registro `preview` se já for o padrão atual).  
2. Import não publica produto.  
3. Import não seta `is_available=true`.  
4. Import **nunca** cria `products` novo.  
5. `price_origin` das linhas aplicadas = `imported`.  
6. Não sobrescrever `manual`/`imported` com cálculo sem ação explícita.  
7. Recalcular só afeta `calculated`, salvo ação explícita.  

---

## 7. Gates de implementação (ordem fixa)

| Gate | Foco | Critério de parada |
|------|------|--------------------|
| **F8.1-I** | Redesign visão geral `/admin/precos` | Cards + tabela + criar/editar/ativar/excluir/duplicar; test + build; **PARAR** |
| **F8.1-J** | Redesign detalhe da lista | Abas Produtos/Formação/Config; filtros; edição inline; voltar ao cálculo |
| **F8.1-K** | Wizard completo importação | 9 etapas; modos; prévia; progresso; resultado |
| **F8.1-L** | Seleção e ações em massa | Página + todos os resultados filtrados |
| **F8.1-M** | Histórico + perfis | Aba Importações + salvar/reusar perfil |
| **F8.1-N** | Polimento + catálogo operacional | Ver backlog; início P0/P1 |

Por gate: diagnóstico → plano técnico → implementação → `npm test` → `npm run build` → diff → relatório → **PARAR**.  
Não iniciar a próxima fase automaticamente.  
Migration só preparar e informar — nunca `db push` sem autorização.

---

## 8. Testes obrigatórios (por gate relevante)

### Importação

- CSV UTF-8; XLSX; acentos  
- SKU duplicado; SKU inexistente  
- Preço inválido; preço zero  
- Arquivo vazio; cabeçalho inválido  
- 2.000 linhas; reimport idempotente  

### Lista

- Criar; editar; ativar; inativar; excluir; abrir  
- Filtrar; selecionar; editar preço; recalcular; voltar ao cálculo  

### Segurança

```text
produto importado ≠ published
produto importado ≠ is_available true automático
```

---

## 9. Critérios de qualidade

- Código simples; UX intuitiva  
- Loading / vazio / erro  
- Confirmações destrutivas  
- Mensagens úteis  
- Sem dados fictícios; sem duplicação de estruturas; sem regressão  

### Resultado esperado para o administrador

1. Criar lista  
2. Configurar regra  
3. Visualizar produtos  
4. Filtrar / pesquisar  
5. Editar preço  
6. Importar com prévia  
7. Acompanhar progresso  
8. Ver resultado e histórico  
9. Reutilizar perfil  
10. Exportar e trabalhar em massa  

sem precisar conhecer banco ou RPCs.

---

## 10. Primeiro passo do Agent (Gate I)

**NÃO IMPLEMENTAR** até autorização explícita.

Somente: inspeção do estado atual + arquivos envolvidos + RPCs + gaps + proposta concreta da F8.1-I.  
Aguardar autorização para implementar F8.1-I.
