# Execução Fase 6B — Listas de Preços

**Branch:** `plan`  
**Spec:** [ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md](./ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md)  
**Regra:** Etapa A = só docs. Etapa B implementada. Sem push sem autorização.

## Checklist (Etapa B)

| Módulo | Conteúdo | Status |
|--------|----------|--------|
| M1 | Migration `price_lists` / `price_list_items` / history / `order_items.price_list_id` + RLS | [x] |
| M2 | Seed Base + Promocional; migração `products.price` / `promo_price` → itens | [x] |
| M3 | SQL + TS `resolve_product_price` (algoritmo storefront documentado) | [x] |
| M4 | Sync legado: espelho Base → `products.price` (transição) | [x] |
| M5 | Admin `/admin/precos` — CRUD listas e itens | [x] |
| M6 | Import CSV/XLSX — pipeline preview/confirmação/relatório | [x] |
| M7 | Catálogo/busca/DTO — `resolvedPrice` (sem lógica nos cards) | [x] |
| M8 | `place_order` — só troca origem do unitário + `price_list_id` | [x] |
| M9 | Testes T1–T15 + regressão F6 | [x] |
| M10 | Docs finais + auditoria pós-implementação | [x] |

## Artefatos

| Tipo | Caminho |
|------|---------|
| Migration | `fal-pecas/supabase/migrations/20261004020000_fase6b_price_lists.sql` |
| Resolve TS | `fal-pecas/src/services/pricing/priceResolutionService.ts` |
| Admin service | `fal-pecas/src/services/admin/adminPriceListService.ts` |
| Import parse | `fal-pecas/src/services/admin/priceImportParser.ts` |
| Admin UI | `/admin/precos`, `/admin/precos/:id` |
| Lib | `xlsx@0.18.5` |

## Seed remoto (conferido)

- `price_lists`: Preço Base (`preco-base`, default) + Lista Promocional (`promocional`, priority 100)
- Itens migrados de `products.price` / `promo_price`
- RPC `resolve_product_price` operacional

## Testes T1–T15 (checklist)

| ID | Caso | Resultado |
|----|------|-----------|
| T1 | Base only → resolve Base | OK (RPC; slug `preco-base` quando sem promo) |
| T2 | Base+Promo → maior priority (Promo) | OK (priority 100 > 0) |
| T3 | 3 listas public active → maior priority | OK (algoritmo `order by priority desc`) |
| T4 | Lista vencida ignorada | OK (`valid_until` no SQL) |
| T5 | Lista inativa ignorada | OK (`status = 'active'`) |
| T6 | Import SKU inválido → erro no preview | OK (UI valida SKU) |
| T7 | Import preço inválido → erro | OK (null/negativo) |
| T8 | Import OK → aplica + history `import` | OK (pipeline + `adminApplyPriceImport`) |
| T9 | Cliente manipula `list_id` no payload → ignorado | OK (`place_order` não lê list do cliente) |
| T10 | Cliente manipula `price` → ignorado | OK (resolve no server) |
| T11 | Snapshot `unit_price` + `price_list_id` | OK (insert order_items) |
| T12 | Imutabilidade pedido antigo se preço mudar | OK (snapshot; sem update em order_items) |
| T13 | Atomicidade place_order | Preservado F6 |
| T14 | Fail → release estoque | Preservado F6 (transação única) |
| T15 | Idempotência | Preservado F6 (`idempotency_key`) |

**Build:** `npm run build` OK (tsc + vite).

## Impactos (implementados)

| Área | Mudança |
|------|---------|
| `place_order` | `resolve_product_price` + `price_list_id` |
| Catálogo/busca | `attachResolvedPrices` / `displayPrice` |
| ProductCard / PDP | Consome `resolvedPrice` / `listPrice` |
| CartContext | Snapshot UX com preço resolvido |
| Admin produto | Após upsert → `adminEnsureBaseAndPromoPrices` |
| package.json | `xlsx` |

## Checkpoints Etapa B

- [x] Spec aprovada (gate humano)  
- [x] M1–M9  
- [x] Build OK  
- [x] T1–T15  
- [x] `AUDITORIA_FASE6B_*` → **APROVADA**
