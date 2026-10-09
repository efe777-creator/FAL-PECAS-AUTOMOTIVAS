# FIND-012 / VAL — Sort catálogo por preço resolvido

**Data:** 2026-10-09  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Escopo:** ordenação global `price_asc` / `price_desc` alinhada a `resolve_product_price`

---

## 1. Problema

RPC `search_products` ordenava por `products.price` (legado). O client só reordenava a **página** atual → páginas cruzadas inconsistentes.

## 2. Alterado

| Camada | Mudança |
|--------|---------|
| SQL | `try_resolve_product_amount` (sem raise) + sort por `coalesce(resolved, promo, price)` |
| SQL | Return `commercial_ref` + `resolved_amount` |
| Busca | Match também em `commercial_ref` |
| Client | `mapRpcRow` lê novos campos; reordenação de página mantida como rede |

**Arquivo:** `supabase/migrations/20261009140000_search_products_resolved_price_sort.sql`  
**Apply:** `supabase db query --linked -f …` (push bloqueado por history remoto — repair fora desta marcha)

## 3. Não alterado

| Item | Motivo |
|------|--------|
| `migration repair` | Gate humano B3 |
| MCP → HF | Paralelo |
| Paginação performance N×resolve | Aceitável no volume atual; otimizar depois se preciso |

## 4. VAL

| Teste | Resultado |
|-------|-----------|
| Apply SQL wtbp | **OK** (`db query --linked`) |
| Smoke `price_asc` page 1 | SK402S 15.60 → … monotônico; sem preço 0 no topo |
| Sem resolve / price 0 | Empurrados ao fim (nulls last) |

## 5. Status

| | |
|--|--|
| FIND-012 | **Fechado** (código + runtime wtbp) |
| Histórico migrations CLI | **Pendente** repair (não registra versão no remote history) |
