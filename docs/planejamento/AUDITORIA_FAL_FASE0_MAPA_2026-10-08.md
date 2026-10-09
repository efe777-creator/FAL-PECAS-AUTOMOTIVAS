# Auditoria FAL Fase 0 — Mapa da plataforma

**Data:** 2026-10-08  
**Comando:** `FAL-AUD-0` / `FAL-AUD-MAP`  
**Branch observada:** `feat/loja-ops-ux-operators`  
**App:** `fal-pecas/`  
**Projeto Supabase MCP:** `owllmfcpbodqmoerdfxx` (sa-east-1)  
**Protocolo:** [PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md](./PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md)  
**Modo:** somente leitura — sem alteração de código

---

## 1. Stack e shells

| Camada | Realidade |
|--------|-----------|
| Frontend | Vite + React 19 + TS + Tailwind 4 + React Router 7 |
| Backend dados | Supabase (PostgREST + RPC + Edge Functions MP) |
| Auth | Supabase Auth + `profiles` / staff (`StaffRoute`) |
| Deploy | Netlify (`fal-pecas` base) |
| Pagamento | Mercado Pago (Edge) + simulated/gateway sandbox |
| Frete | Mock / stubs Correios·Frenet·carrier via env |

**Shells UI**

- Loja: `MainLayout` → Header / SearchBar / MobileNav / Footer  
- Admin: `AdminLayout` (sidebar catálogo / vendas / ops)  
- Conta: `AccountLayout`  
- Router único: [`fal-pecas/src/app/router.tsx`](../../fal-pecas/src/app/router.tsx)

---

## 2. Mapa de rotas

### Admin (StaffRoute)

| Rota | Página | Domínio |
|------|--------|---------|
| `/admin` | Dashboard | atalhos + contagens pedido |
| `/admin/produtos` (+ novo/:id) | Produtos / ficha | catálogo |
| `/admin/produtos/importar*` | Catálogo / apps / HF | import |
| `/admin/precos` (+ :id) | Listas + itens + import preço | preços |
| `/admin/categorias` | Árvore L3 | taxonomia |
| `/admin/montadoras` `/veiculos` `/fabricantes` | PVC / brands | veículos |
| `/admin/fornecedores` (+ imports) | Conversão / custo | custo |
| `/admin/pedidos` `/clientes` `/estoque` `/frete` `/relatorios` `/operadores` | Ops | operação |

### Loja

| Rota | Página |
|------|--------|
| `/` `/catalogo` `/produto/:id` `/veiculo` | vitrine |
| `/carrinho` `/checkout` | compra |
| `/conta/*` `/login` `/cadastro` | conta |

**Órfão:** `pages/Orders/OrdersPage.tsx` (redirect `/pedidos` → conta; página antiga não roteada).

---

## 3. Cadeias oficiais (fonte candidata)

### 3.1 Produto → vitrine

```text
AdminProductForm / Import apply
  → products (+ product_categories, brands/manufacturers)
  → status (draft|published|archived) + is_available
  → search_products / listPublishedProducts
  → ProductCard / ProductPage
  → Cart → place_order (exige published + is_available + preço)
```

**Regra:** `status ≠ is_available`. Import **não** libera loja. Liberação: `adminReleaseProductToStore`.

### 3.2 Preço

```text
supplier_products.cost (+ products.supplier_id)
  → regra lista (pricing_method / percent / extras)
  → price_list_items.price + price_origin (calculated|imported|manual)
  → [override ativo] → resolve_product_price / attachResolvedPrices
  → espelho legado products.price / promo_price (Base/Promo)
  → card/PDP / checkout
```

**Histórico:** `price_change_history.source` (≠ `price_origin`).

### 3.3 Lista de preços

```text
price_lists (status draft|active|inactive, scope, priority, is_default)
  → price_list_items (existência + price; SEM status item)
  → resolução: override → listas active public por priority → fallback is_default
```

### 3.4 Importação

```text
Arquivo → parse (csv/xlsx) → preview (imports/import_items)
  → apply_* RPC por kind
  → produto / PVC / custo / conversão / preço
```

Kinds observados no remoto: `catalog` (`done`/`preview`). UI de histórico de runs: **só** lista de preços.

### 3.5 Pedido / pagamento / frete

```text
Carrinho → Checkout (ID → endereço → entrega → pagamento → revisão)
  → place_order
  → paymentService (VITE_PAYMENT_PROVIDER)
  → create-mp-payment + webhook (F9-E)
Frete: quoteFreight ← VITE_SHIPPING_PROVIDER (default mock)
```

---

## 4. Mapa banco remoto vs repo

| Aspecto | Repo local (`fal-pecas/supabase/migrations`, ~52 SQL fase*) | Remoto MCP (`list_migrations` hf_f1_*) |
|---------|--------------------------------------------------------------|----------------------------------------|
| Origem | Fases F2–F9 + F8.1 incrementais | Rebuild HF F1 + patches import/search |
| Pedidos / estoque / overrides | Migrations presentes | **Tabelas ausentes** no `public` |
| Categorias | historicamente `categories` | `product_categories` |
| Veículos | makes/models… (fase) | `manufacturers` / `models` / `vehicle_versions` |
| RPCs preço/pedido | `resolve_product_price`, `place_order`, … | Observados: `search_products`, `recalculate_calculated_for_products`, `admin_search_users` |

**Conclusão de mapa:** há **duas linhagens de schema**. O app atual já referencia em parte o schema HF (`product_categories`, `manufacturers`), mas o repositório ainda carrega a linhagem fase completa (pedidos, estoque, overrides, MP SQL). Isso é a dependência estrutural nº 1 da consolidação.

---

## 5. Dados remotos (snapshot 2026-10-08)

| Métrica | Valor |
|---------|------:|
| Produtos | 52 |
| Published | 52 |
| `is_available=true` | **1** |
| Published + indisponível | 51 |
| Compatibilidade (linhas / produtos) | 1 / 1 |
| Sem aplicação | 51 |
| Listas de preço | 2 (Base default + Promocional priority **100**) |
| Itens com preço > 0 | 1 |
| `supplier_products` com custo | 0 |
| Produtos com `supplier_id` | 1 |
| Imports | catalog done×2, preview×1 |
| Pedidos (tabela) | **inexistente no remoto** |

---

## 6. UI observada (Browser)

| Tela | Evidência |
|------|-----------|
| `/admin` | Dashboard com contadores de pedido = 0; atalhos catálogo |
| `/catalogo` | Shell + busca + filtros OK; grade de produtos não evidenciada no viewport (carregamento lento / resultado vazio) |
| `/admin/produtos`, `/admin/precos` | Estado “Verificando permissões…” (sessão staff / latência) |

MCP: `cursor-ide-browser` em `http://localhost:5173`.

---

## 7. Git / remoto código

- Origin: `https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS.git`  
- Commits recentes: preços/loja, import CSV, operadores, F9-E webhook, Netlify base `fal-pecas`.

---

## 8. Fontes de verdade candidatas (por domínio)

| Domínio | Oficial candidata | Paralelas a eliminar/alinhar |
|---------|-------------------|------------------------------|
| Custo | `supplier_products.cost` + supplier principal | preview TS `resolveBaseCost` vs SQL sem fallback FAL |
| Preço venda | `resolve_product_price` + item lista | espelho `products.price`; carrinho UX |
| Disponibilidade loja | `is_available` + Liberar | listagem published sem filtro available |
| Publicação | `products.status` | — |
| Aplicação | `product_vehicle_compatibility` | texto livre / mocks |
| Pedido | RPC `place_order` + tabelas order* (repo) | **ausente no remoto atual** |
| Frete | `freightService` + origem loja | stubs / mock |
| Pagamento | Edge MP + `payment_events` | simulated |

---

## 9. Próximo artefato

→ [AUDITORIA_FAL_FASE0_INVENTARIO_2026-10-08.md](./AUDITORIA_FAL_FASE0_INVENTARIO_2026-10-08.md)
