# Especificação — Importação Produto × Aplicação × HF

**Data:** 2026-10-07 · **Status:** fechada para execução

## Princípio

- **Produto** = o que a FAL vende (`codigo_fal` único), incluindo posição e lado.
- **Aplicação** = veículos em que serve (N por SKU) — sem posição/lado/categoria.
- Sem tabela nova: `imports` + `import_items`.
- Fora: fabricante peça, preço, custo, estoque, F7/F8/F9, F, MP/G.

## Frente A — Produtos (`kind=catalog`)

| Campo | Obrigatório | Destino |
|-------|-------------|--------|
| codigo_fal | sim | products.sku |
| nome | sim | products.name |
| categoria | sim | categoria raiz |
| grupo | sim | filho da categoria |
| subgrupo | não | neto do grupo |
| posicao | não | products.posicao |
| lado | não | products.lado |
| descricao_curta | não | short_description |
| descricao | não | description |

Sem montadora. Novos: draft + is_available=false + price=0.  
`category_id` = folha (subgrupo | grupo | categoria).  
RPC: `apply_catalog_products_import`.

### Posição / lado (canônicos)

- **posicao (átomos):** `DIANTEIRA` | `TRASEIRA` | `SUPERIOR` | `INFERIOR` | null  
  Combinações com `_` (ex. `DIANTEIRA_INFERIOR`). Entrada HF: `DIANT INFERIOR`, `DIANT/SUP`, `TRAS;INFERIOR`.  
- **lado:** `ESQUERDO` | `DIREITO` | `AMBOS` | null  

Normalização posição: DIANT→DIANTEIRA; TRAS→TRASEIRA; SUP→SUPERIOR; INF→INFERIOR.  
Lado: LE→ESQUERDO; LD→DIREITO; LD/LE→AMBOS.  
Valor preenchido inválido → erro de linha.

## Frente B — Aplicações (`kind=catalog_applications`)

```text
codigo_fal*; montadora*; modelo*; versao; ano_inicio; ano_fim
```

**SKU inexistente = erro. Não cria produto.**  
RPC: `apply_catalog_applications_import` → PVC (year_start/year_end).

## Frente C — HF completo

```text
codigo_fal;nome;categoria;grupo;subgrupo;posicao;lado;montadora;modelo;versao;ano_inicio;ano_fim;descricao_curta;descricao
```

N linhas do mesmo SKU → **1 produto + N aplicações**.  
Dois imports; apply sequencial (produto → aplicações).

## Gates / STOP

Vitest + tsc + build + relatório. **STOP sem commit/push.**
