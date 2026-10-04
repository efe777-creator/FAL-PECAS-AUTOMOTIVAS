# Execução Fase 6B — Listas de Preços

**Branch:** `plan`  
**Spec:** [ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md](./ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md)  
**Regra:** Etapa A = só docs (feita). **Código somente após aprovação humana (Etapa B).** Sem push sem autorização.

## Checklist (Etapa B)

| Módulo | Conteúdo | Status |
|--------|----------|--------|
| M1 | Migration `price_lists` / `price_list_items` / history / `order_items.price_list_id` + RLS | [ ] |
| M2 | Seed Base + Promocional; migração `products.price` / `promo_price` → itens | [ ] |
| M3 | SQL + TS `resolve_product_price` (algoritmo storefront documentado) | [ ] |
| M4 | Sync legado: espelho Base → `products.price` (transição) | [ ] |
| M5 | Admin `/admin/precos` — CRUD listas e itens | [ ] |
| M6 | Import CSV/XLSX — pipeline preview/confirmação/relatório | [ ] |
| M7 | Catálogo/busca/DTO — `resolvedPrice` (sem lógica nos cards) | [ ] |
| M8 | `place_order` — só troca origem do unitário + `price_list_id` | [ ] |
| M9 | Testes T1–T15 + regressão F6 | [ ] |
| M10 | Docs finais + auditoria pós-implementação | [ ] |

## Impactos mapeados (não implementar na Etapa A)

| Área | Impacto |
|------|---------|
| `place_order` | Substituir `coalesce(promo_price, price)` por resolve; resto intacto |
| `search_products` | Sort/preço resolvido (batch ou join) |
| ProductCard / PDP | Consumir DTO resolvido |
| CartContext | Snapshot UX; verdade no server |
| Admin produto | Formulário pode continuar editando Base (via service de lista) |
| package.json | Provável adição de parser XLSX na Etapa B |
| F8 imports | 6B antecipa **só** import de preços; catálogo massivo permanece F8 |

## Migrations previstas (Etapa B)

`fal-pecas/supabase/migrations/*_fase6b_price_lists.sql`  
(+ seed/migração de dados na mesma ou migration seguinte)

## Rotas alvo

- `/admin/precos` (+ sub-rotas lista/import se necessário)

## Services alvo

```
src/services/pricing/priceResolutionService.ts
src/services/admin/adminPriceListService.ts
src/services/admin/adminPriceImportService.ts
```

## Decisões — não reabrir na implementação

1. Resolução storefront = public + active + vigência + maior priority; fallback default  
2. Cliente nunca envia/escolhe lista  
3. Preservar F6 integralmente  
4. `products.price` permanece como espelho na transição  

## Checkpoints Etapa B

- [ ] Spec aprovada (gate humano)  
- [ ] M1–M9  
- [ ] Build OK  
- [ ] T1–T15  
- [ ] `AUDITORIA_FASE6B_*` atualizada para APROVADA (implementação)
