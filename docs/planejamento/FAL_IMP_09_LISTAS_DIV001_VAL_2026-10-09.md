# FAL-IMP-09 / VAL-09 — Listas + DIV-001 B

**Data:** 2026-10-09  
**Gate:** Onda 1  
**Escopo:** item de lista = **com preço / sem preço** (sem active/inactive no item) + vocabulário PT de origem

---

## 1. Auditado

| Item | Achado |
|------|--------|
| Schema `price_list_items` | Sem coluna status — alinhado à opção B |
| Overview / filtros | Já contavam `withPrice` / `withoutPrice` (price > 0) |
| UI badges origem | EN `CALCULATED` / `IMPORTED` / `MANUAL` vs filtros PT |
| Prompt Mestre “ativos/inativos” no item | Não refletido no código; risco de confusão |
| PRD § item | Já descrevia DIV-001 B |

---

## 2. Causas

Vocabulário do Prompt (ativo/inativo no item) e badges EN competiam com o modelo real (price > 0). Faltava fonte única de rótulos + copy explícito das 3 camadas.

---

## 3. Alterado

| Camada | Mudança |
|--------|---------|
| [`priceLabels.ts`](../../fal-pecas/src/lib/priceLabels.ts) | `isPriceListItemPriced`, rótulos Com/Sem preço, origem PT, hints de camadas/prioridade |
| Admin listas / detalhe / quick / modal | Badges e stats em PT; copy DIV-001; prioridade com hint |
| `adminPriceListService` | Contagens/filtros usam `isPriceListItemPriced` |
| PRD | DIV-001 marcado **Feito IMP-09** |

**Política oficial:**

```text
Lista     → draft / Ativa / Inativa
Item      → Com preço (price > 0) | Sem preço   ← NÃO há active/inactive
Produto   → is_available / status published
Origem    → Calculado | Importado | Manual (D16)
Prioridade da lista → desempate real na resolução (manter)
```

---

## 4. Não alterado

| Item | Motivo |
|------|--------|
| Schema item (sem coluna status) | Decisão B — não criar active/inactive |
| D16 / recalc só calculated | Já correto |
| Liberar checklist massa | **IMP-10** |
| Escopo `public`/`assigned` EN no select | Técnico interno; backlog vocabulário fino se precisar |

---

## 5. VAL-09

| Teste | Resultado |
|-------|-----------|
| Vitest `priceLabels` + overview + sync filter | **10 passed** |
| Sem migration / sem mudança destrutiva de dados | **OK** |

---

## 6. Status

| | |
|--|--|
| FAL-IMP-09 | **Concluído** |
| FAL-VAL-09 | **PASS** |
| DIV-001 | **Fechado** |
| FIND-011 (origem EN) | **Parcial fechado** na UI de listas; SKU vs ref já IMP-03 |

**Próximo bloco:** `FAL-IMP-06` (import + histórico UI) — ordem do plano Onda 1.
