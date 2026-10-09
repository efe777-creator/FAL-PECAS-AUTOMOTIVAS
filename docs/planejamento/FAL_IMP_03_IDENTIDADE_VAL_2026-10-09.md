# FAL-IMP-03 / VAL-03 — Códigos, slugs e D-REF

**Data:** 2026-10-09  
**Gate:** Onda 1  
**Escopo:** identidade produto (Código referência ≠ SKU) + auto-espelho se vazio

---

## 1. Auditado

| Item | Antes |
|------|--------|
| UI “Código referência” | Rótulo sobre `products.sku` |
| Coluna comercial | Inexistente |
| Slug | Já auto via `toSlug(name)` no upsert |
| Dados runtime | 100 SKUs únicos |

---

## 2. Alterado

| Camada | Mudança |
|--------|---------|
| DB | `products.commercial_ref NOT NULL UNIQUE` + backfill `= sku` ([migration](../../fal-pecas/supabase/migrations/20261009120000_products_commercial_ref.sql)) — **aplicada no runtime `wtbp…`** |
| `productIdentity.ts` | Resolve ref/sku (espelha se um vazio; permite distintos) |
| Admin form | Código referência + SKU FAL (técnico) |
| Admin lista / busca | Exibe/busca `commercial_ref` |
| Card / PDP | `formatCodigoReferenciaFromProduct` |
| PRD | D-REF marcado feito |

**Política:**

```text
Código referência (commercial_ref)  → operacional / loja
SKU FAL (sku)                       → técnico / import / matching
Se um vazio no save → espelha o outro
Ambos únicos
Slug                   → auto do nome (já existia)
```

---

## 3. Não alterado

| Item | Motivo |
|------|--------|
| Matching de import por `sku` | Continua fonte técnica; ref comercial não substitui import |
| RPC `search_products` corpo | `search_document` já atualizado no backfill; evolução RPC = IMP futuro se necessário |
| Pricing / Liberar | IMP-08 / IMP-10 |

---

## 4. VAL-03

| Teste | Resultado |
|-------|-----------|
| Vitest `productIdentity` + `entityNormalize` | **8 passed** |
| SQL: 100 produtos com `commercial_ref = sku` (backfill) | **OK** |
| Coluna + índice único | **OK** |

---

## 5. Próximo

Ordem do plano: **`FAL-IMP-08`** (preços + DIV-002 — resolução única), depois IMP-09 listas.
