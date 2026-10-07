# Especificação — Importação Produto × Aplicação (+ HF)

**Data:** 2026-10-07 · **Status:** fechada para execução

## Princípio

- **Produto** = o que a FAL vende (`codigo_fal` único).
- **Aplicação** = veículos em que serve (N por SKU).
- Fabricante da peça: fora desta marcha.
- Sem tabela nova: só `imports` + `import_items` (contratos/payloads diferentes).
- F7/F8/F9/F/G: não tocar.

## Fluxos

```text
Frente A: produtos.csv → prévia → import_items (kind=catalog) → apply_catalog_products_import → products + categories
Frente B: aplicacoes.csv → prévia DB → import_items (kind=catalog_applications) → apply_catalog_applications_import → PVC
Frente C: HF completo → split 1 produto + N apps → dois imports → apply sequencial (produto → apps)
```

---

## Frente A — Produtos (`kind=catalog`)

| Campo | Obrigatório | DB |
|-------|-------------|-----|
| codigo_fal (sku) | sim | products.sku |
| nome | sim | products.name |
| categoria | sim | product_categories (raiz) |
| grupo | sim | filho de categoria |
| subgrupo | não | neto de grupo |
| descricao_curta | não | short_description |
| descricao | não | description |

- Sem montadora no payload de produto.
- Novos: `draft` + `is_available=false` + `price=0`.
- Update: nome/descrições/categoria; não publica; não mexe estoque.
- `category_id` = folha (subgrupo | grupo | categoria).
- RPC: `apply_catalog_products_import` (transacional; RAISE → rollback total).
- UI: Admin → Importar produtos (cadastro).

---

## Frente B — Aplicações (`kind=catalog_applications`)

| Campo | Obrigatório |
|-------|-------------|
| codigo_fal | sim |
| montadora | sim |
| modelo | sim |
| versao | não |
| ano_inicio | não |
| ano_fim | não (vazio = vigente) |

### Regra definitiva

> **SKU inexistente = erro. A importação de aplicação não cria produto.**

- Nome opcional (não obrigatório).
- `create_product` desligado no motor.
- Mantém: payload congelado, PVC, idempotência 2 níveis, VV ambígua → revisão, rollback total na RPC.
- RPC: `apply_catalog_applications_import`.

---

## Frente C — Arquivo HF completo

Layout aceito:

```text
codigo_fal;nome;categoria;grupo;subgrupo;montadora;modelo;versao;ano_inicio;ano_fim;descricao_curta;descricao
```

### Fluxo

1. Validação do layout (colunas produto E aplicação).
2. Deduplicação / consolidação por `codigo_fal`.
3. Split: 1 registro produto por SKU + 1 aplicação por linha.
4. Prévia produto + prévia aplicação na mesma tela.
5. Confirmação única (aviso: produtos gravados antes das aplicações).
6. Apply sequencial: produtos → aplicações.
7. Relatório combinado.

### SKU repetido N vezes

Ex.: `1307B` × 5 linhas → **1 produto + 5 aplicações**.

Consolidação do produto: primeira linha com valores válidos por campo; discórdia de nome/categoria/grupo em linhas posteriores → **warning** (não bloqueia).

### Staging

- Dois `imports` na mesma sessão: `catalog` + `catalog_applications`.
- Se apps falharem após produtos OK: cadastro permanece; UI orienta reimportar só aplicações.
- Sem RPC bundle atômica cruzada nesta marcha.

---

## Gates de teste / rollback

### A

1. Produto inexistente → create draft  
2. Existente → update  
3. categoria/grupo/subgrupo criados e ligados  
4. SKU duplicado no arquivo produtos-only → erro/consolidação  
5. Reapply mesmo `import_id` → rejeitado  
6. Falha crítica → zero parcial  
7. Sem montadora no payload de produto  

### B

1. SKU existente + app nova → create PVC  
2. SKU inexistente → error (não cria produto)  
3. Já contemplado / expansão / lacuna → review  
4. Split seguro 1.0/1.6  
5. Reimport mesmo conteúdo → already_covered  
6. Reapply → rejeitado  
7. RAISE → rollback total  

### C

1. HF `1307B` × 5 → prévia 1 produto + 5 apps  
2. Confirmação aplica produto depois apps  
3. Produto OK + app falha → parcial + apps reimportáveis  
4. Reimport HF → products existing + apps already_covered  

### Gate final

- vitest (contratos + split HF + motor)  
- tsc + vite build  
- Spec + relatório marcha  
- **STOP sem commit/push**
