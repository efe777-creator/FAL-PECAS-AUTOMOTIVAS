# Backlog — Fase 8.1: Catálogo operacional

**Status:** Backlog documental — sem implementação nesta etapa.  
**Data:** 2026-10-06  
**Tipo:** Evolução operacional do cadastro/importação de produtos  
**Irmãos:** [ESPECIFICACAO_FASE8_1_LISTAS_PRECOS_UX.md](./ESPECIFICACAO_FASE8_1_LISTAS_PRECOS_UX.md) · [PROMPT_MESTRE_FASE8_1_LISTAS_PRECOS.md](./PROMPT_MESTRE_FASE8_1_LISTAS_PRECOS.md)  
**Base:** [ESPECIFICACAO_FASE8_1_IMPORTACAO_CATALOGO.md](./ESPECIFICACAO_FASE8_1_IMPORTACAO_CATALOGO.md) (F8.1-A…H — motor já existe; este backlog evolui UX + classificação)

---

## 1. Objetivo

```text
IMPORTAÇÃO DE PRODUTOS
        ↓
normalização
        ↓
anti-duplicidade
        ↓
classificação
        ↓
enriquecimento
        ↓
revisão
        ↓
produto pronto (ainda draft)
```

Separado do fluxo de **preços** (arquivo `SKU;PRECO` / wizard de listas).  
Não misturar com fornecedor, estoque nem compatibilidade veicular definitiva nesta rodada.

---

## 2. Layout canônico FAL (decisão eFe) — 4 colunas

A tabela operacional de importação de **produtos/cadastro** fica travada nestas colunas:

```text
CODIGO | GRUPO | MONTADORA | DESCRICAO
```

### Exemplo

| CODIGO | GRUPO | MONTADORA | DESCRICAO |
|--------|-------|-----------|-----------|
| FAL001 | Suspensão | Volkswagen | PIVÔ PALIO / SIENA |
| FAL002 | Direção | Fiat | TERMINAL DE DIREÇÃO |

### Mapeamento → sistema

| Coluna do arquivo | Campo canônico | Destino | Regra |
|-------------------|----------------|---------|--------|
| `CODIGO` | `codigo_fal` | `products.sku` | Obrigatório; UNIQUE; chave do upsert |
| `DESCRICAO` | `descricao` | `products.name` (+ description se vazio) | Obrigatório |
| `GRUPO` | `grupo` | taxonomia / categoria FAL | Vem do arquivo; se vazio → motor de regras sugere |
| `MONTADORA` | `montadora_sugerida` | metadado / sugestão | Vem do arquivo; **nunca** cria `product_vehicle_compatibility` automático |

### O que essa tabela NÃO é

| Confusão | Correção |
|----------|----------|
| `MONTADORA` = marca da peça | **Não.** Marca da peça = `product_brands` |
| `MONTADORA` = compatibilidade confirmada | **Não.** Só sugestão auditável |
| `GRUPO` = subgrupo automático | Subgrupo pode vir depois por regra/revisão |
| Grade = preço / custo / estoque | **Não.** Preço = wizard de listas; custo = `supplier_products` |

### Perfil HF padrão

**HF — Cadastro FAL (4 colunas)**

```text
CODIGO    → codigo_fal
GRUPO     → grupo
MONTADORA → montadora_sugerida
DESCRICAO → descricao
```

Detectar automaticamente quando o cabeçalho bater (case-insensitive, com/sem acento: `CODIGO`, `Código`, `DESCRICAO`, `Descrição`, etc.).

---

## 3. Camadas — classificar o máximo sem bagunçar

### Camada 1 — Arquivo (operador)

As 4 colunas acima. Nada mais obrigatório nesta rodada.

### Camada 2 — Persistência imediata no upsert

| Dado | Ação no apply |
|------|----------------|
| `CODIGO` | upsert por SKU |
| `DESCRICAO` | grava nome |
| `GRUPO` | associa categoria se mapeável; senão fila de revisão |
| `MONTADORA` | grava como **sugestão** com origem=`import`; não cria vínculo veículo |

Produto novo: `status = draft`, `is_available = false` (inviolável).

### Camada 3 — Enriquecimento pós-import

Só quando Camada 1 não trouxe o suficiente **ou** para refinar:

| Informação | Como | Gravação |
|------------|------|----------|
| Subgrupo / refino de grupo | regras FAL + confiança | Alta/média com confirmação; baixa = só sugestão |
| Montadora se coluna vazia | tokens na descrição (FOX→Volkswagen) | sugestão; nunca compat automática |
| Marca da peça / cód. fabricante | perfil futuro (fora das 4 colunas) | opcional |
| Origem do dado | auditoria | import / HF / regra / sugestão / manual |

### Camada 4 — FORA desta tabela e desta rodada

- `codigo_fornecedor` / conversões / custos  
- modelo / ano / compatibilidade definitiva  
- preço de lista (arquivo separado `SKU;PRECO`)  
- estoque / `is_available` / `status=published`  

**Regra anti-bagunça:** CSV enxuto (4 colunas). Inteligência (regras, confiança, revisão) **depois** do upsert — sem inventar colunas no mesmo passo silencioso.

```text
arquivo (CODIGO|GRUPO|MONTADORA|DESCRICAO)
  → perfil HF 4 colunas
  → normalização UTF-8
  → validação / anti-duplicidade SKU
  → upsert (sku + nome + grupo se resolvido + montadora sugerida)
  → motor de regras (só buracos / refino)
  → tela de revisão (confiança)
  → operador confirma
  → produto pronto (ainda draft)
```

---

## 4. Normalização

**Preservar** acentos válidos: `á ã é í ó õ ç ú`.

**Corrigir** mojibake de encoding incorreto: `Ã©` → `é`, `Ã£` → `ã`, `Ã§` → `ç`.

**Tratar:** BOM; caracteres de controle; espaços; aspas; delimitadores; quebras de linha dentro de células.

**Não** remover acentos válidos.

Formato esperado: CSV UTF-8 com `;` (XLSX = mesma grade lógica).

---

## 5. Classificação automática (regras FAL)

Exemplos iniciais (auditáveis, versionáveis):

| Token na descrição | Grupo / subgrupo sugerido |
|--------------------|---------------------------|
| PIVÔ | Suspensão / Pivô |
| TERMINAL | Direção / Terminal |
| BIELETA | Suspensão / Bieleta |
| BANDEJA | Suspensão / Bandeja |
| AMORTECEDOR | Suspensão / Amortecedor |

Sempre como **classificação sugerida** até confiança suficiente + regra aprovada.

Níveis de confiança: **Alta** | **Média** | **Baixa**.  
Baixa confiança → **não** aplicar automaticamente.

Se `GRUPO` já veio no arquivo e for mapeável → priorizar arquivo (origem=`import`); regras só refinam subgrupo ou preenchem buracos.

---

## 6. Montadora

```text
Marca da peça  ≠  Montadora do veículo
FOX → Volkswagen   = sugestão, NÃO compatibilidade automática
```

Arquitetura `manufacturers → models → vehicle_versions → product_vehicle_compatibility` existe, mas **fica fora** desta fase até fonte confiável de dados.

---

## 7. Filtros avançados de produtos (admin catálogo)

Adicionar (Gate N / P1):

```text
Código · Descrição · Status · Marca · Grupo · Subgrupo
Com preço · Sem preço · Com custo · Sem custo
Com imagem · Sem imagem · Completo · Incompleto
Disponível · Indisponível
```

`[Salvar filtros]` = etapa posterior (não bloqueante).

---

## 8. Ações em massa (admin catálogo)

```text
☐ Selecionar página
Selecionar todos os N resultados filtrados

[Ativar] [Inativar] [Excluir] [Exportar]
```

Excluir sempre com confirmação:

> Excluir N produtos? Esta ação não pode ser desfeita.

---

## 9. Prioridades P0–P3

### P0 — Segurança e coerência (antes de polir UX)

| Item | Descrição |
|------|-----------|
| UTF-8 / encoding | Preservar acentos; corrigir mojibake |
| Bug ativo/admin vs catálogo | Produtos importados “ativos” no admin mas inconsistentes no catálogo até toggle — **encontrar causa real**; não mascarar com workaround |
| UNIQUE / upsert SKU | Idempotência na reimportação |
| Não encontrados | Relatório claro |
| Pós-import coerente | `draft` ≠ published ≠ available |

Investigar fluxo:

```text
importar → produto draft → is_available → admin → catálogo
```

Spec vigente: import **não** publica e **não** disponibiliza automaticamente.

### P1 — Operação

- Progresso UX na importação de catálogo  
- Filtros avançados  
- Seleção / massa  
- Retorno coerente à listagem após ações  

### P2 — Inteligência controlada

- Perfil HF 4 colunas  
- Regras de classificação (só buracos/refino)  
- Confiança + tela de revisão  
- Origem do dado auditável  
- Sugestão de montadora (sem compat automática)  

### P3 — Registrar só (não implementar agora)

- Aplicações / base veicular / placa  
- Inteligência de compatibilidade definitiva  

---

## 10. Fora de escopo desta rodada

| Item | Motivo |
|------|--------|
| Código de fornecedor / conversões | Módulo existe; não é foco UX desta fatia |
| Custos no CSV de cadastro | Fonte = `supplier_products` |
| Preço no CSV de cadastro | Wizard de listas separado |
| Compatibilidade veicular definitiva | Sem fonte confiável |
| Alterar `place_order` / F7 / F8 / estoque | Regressão operacional |
| Tabelas paralelas de preço | Já existe F6B/F8.1 |
| `db push` / repair / fetch / commit / push | Só com autorização explícita |

---

## 11. Relação com gates I–N

| Gate | Catálogo neste gate |
|------|---------------------|
| I–M | Foco em **listas de preços**; catálogo só se bug P0 bloquear aceite |
| **N** | Polimento preços + **início** catálogo operacional (P0 → P1; P2 conforme aceite) |

Uma prioridade por vez. Diagnóstico → plano → implementação → `npm test` + `npm run build` → relatório → **PARAR**.

---

## 12. Testes específicos (quando implementar)

- Layout 4 colunas UTF-8 com acentos  
- Cabeçalho variante (`Código` vs `CODIGO`)  
- SKU duplicado no arquivo; SKU já existente (upsert)  
- GRUPO mapeável vs não mapeável (fila revisão)  
- MONTADORA gravada como sugestão sem criar compat  
- Coluna vazia = preservar (regra D3 da spec F8.1)  
- Produto novo = draft + `is_available=false`  
- Reimport idempotente  
- Encoding mojibake corrigido sem destruir acento válido  

---

## 13. Critério de pronto do backlog (visão)

O administrador consegue:

1. Importar planilha `CODIGO|GRUPO|MONTADORA|DESCRICAO`  
2. Revisar sugestões de classificação com confiança  
3. Filtrar e operar o catálogo em massa  
4. Manter produtos importados **não publicados** até decisão explícita  
5. Separar claramente cadastro × preço × custo × veículo  

sem bagunçar o banco com estruturas paralelas.
