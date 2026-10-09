# FAL-IMP-10 / VAL-10 — Loja / Liberar (D-LIBERAR)

**Data:** 2026-10-09  
**Gate:** Onda 1  
**Escopo:** checklist mínimo para liberação unitária e em massa

---

## 1. Auditado

| Item | Antes |
|------|--------|
| Liberar unitário | Já usava `resolve_product_price` (IMP-08) |
| Bulk | Confirm genérico → libera sem pré-flight tipado |
| Soft rules | Inexistentes (app/imagem) |

---

## 2. Alterado

| Camada | Mudança |
|--------|---------|
| [`releaseChecklist.ts`](../../fal-pecas/src/lib/releaseChecklist.ts) | Hard: nome, código ref., categoria, preço resolvido, publicação; Soft: app PVC, imagem |
| `adminEvaluateReleaseChecklist(+Batch)` | Pré-flight sem gravar |
| `adminReleaseProductToStore` | Só libera se hard OK |
| Admin produtos lista | Painel pré-flight → confirma só elegíveis |
| Admin form | Avalia checklist antes do confirm |
| PRD | D-LIBERAR **Feito IMP-10** |

**Política:**

```text
HARD  = nome + commercial_ref/sku + category_id + preço resolve > 0 + (published | publishIfNeeded)
SOFT  = aplicação PVC + imagem (aviso, não bloqueia)
Import NÃO seta is_available (inalterado)
```

---

## 3. Não alterado

| Item | Motivo |
|------|--------|
| Anti-auto-publish em imports | Congelado |
| `status ≠ is_available` | Congelado |
| Exigir app/imagem como hard | PRD “quando exigidas” — default soft nesta marcha |

---

## 4. VAL-10

| Teste | Resultado |
|-------|-----------|
| Vitest `releaseChecklist` | **6 passed** |

---

## 5. Status

| | |
|--|--|
| FAL-IMP-10 | **Concluído** |
| FAL-VAL-10 | **PASS** |
| FIND-002 | Processo Liberar fechado nesta camada |
| Próximo | `FAL-IMP-07` — **feito** ([VAL-07](./FAL_IMP_07_CARD_PDP_VAL_2026-10-09.md)); Onda 1 fechada |
