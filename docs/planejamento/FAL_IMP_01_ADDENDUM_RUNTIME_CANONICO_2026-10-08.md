# FAL-IMP-01 — Adendo: projeto runtime canônico

**Data:** 2026-10-08  
**Severidade:** corrige o parecer anterior (project-ref errado no MCP)

---

## 1. Achado crítico

| Fonte | Project ref | Org | Papel |
|-------|-------------|-----|-------|
| App `.env` + CLI `linked` | **`wtbpwuiayednvlhvuhbh`** | `kastimzxobgyfkqjsdsv` (efe777-creator) | **Runtime real da FAL** |
| MCP `user-supabase` (Fase 0 / IMP-01 inicial) | `owllmfcpbodqmoerdfxx` | HF COMERCIO DE PECAS | Projeto **HF** — **não** é o banco da app |

O parecer [FAL_IMP_01_SCHEMA_DIFF_PARECER_2026-10-08.md](./FAL_IMP_01_SCHEMA_DIFF_PARECER_2026-10-08.md) descreve corretamente o projeto **HF**, mas **não** o banco que a loja/admin usam.

---

## 2. Schema real da app (`wtbp…`) — evidência CLI

### Tabelas

Presentes: `products`, `product_categories`, `orders`, `order_items`, `order_events`, `carts`, `cart_items`, `inventory`, `inventory_movements`, `store_settings`, `payments`, `payment_events`, `shipments`, `store_shipping_origin`, `product_price_overrides`, `customer_addresses`, `customer_vehicles`, `favorites`, preços, imports, suppliers, PVC, etc.

**Ausente (antes deste adendo):** `import_profiles` → **aplicado** via SQL prepared `20261006120000` (IF NOT EXISTS).

### RPCs críticas

Presentes: `place_order`, `resolve_product_price`, `resolve_product_prices`, `search_products`, `transition_order_status`, `confirm_simulated_payment`, `confirm_mercadopago_payment`, `get/set_store_inventory_mode`, `adjust_inventory`, `product_base_cost`, `recalculate_*`, `apply_*`, `admin_orders_*`, `current_customer_id`, operadores admin, …

### `customers`

Modelo **B2C Git**: `profile_id`, `cpf`, `cnpj` — **compatível** com a app.

### Dados (snapshot)

| Métrica | Valor |
|---------|------:|
| products | 100 |
| is_available | 99 |
| price_list_items com preço > 0 | 198 |
| orders | 0 |
| product_price_overrides | 0 |

### Migrations

Linhagem **`fase*`** presente no remoto.  
Há **drift de histórico**: muitas versões só no remoto (SQL Editor / pushes com timestamp diferente) e alguns arquivos locais ainda não registrados.  
`supabase db push` **falha** até `migration repair` + sincronização — **não executado** nesta marcha (higiene; não bloqueia runtime).

---

## 3. Revisão do parecer D-SCHEMA

| Pergunta | Resposta corrigida (runtime) |
|----------|------------------------------|
| Opção 1 (`fase*` canônica) viável? | **Já é a realidade** do projeto da app |
| A1 (projeto novo)? | **Desnecessário** para o runtime atual |
| A2 (reset)? | **Não recomendado** — perderia 100 produtos / 198 preços |
| B (aditivo no HF)? | Irrelevante para a app; HF continua fonte de dados, não dono do schema FAL |
| P0 FIND-001 no MCP HF? | Válido **só** para `owll…` — não confundir com runtime |

**Decisão operacional (MARCHA 2026-10-08):**

> Canônico da plataforma FAL em execução = **`wtbpwuiayednvlhvuhbh`**.  
> MCP deve apontar para esse projeto (ou org efe777) nas próximas auditorias.  
> Projeto HF `owll…` = ambiente/fonte auxiliar — não usar como verdade do schema da loja.

---

## 4. Alinhamento mínimo executado

| Ação | Status |
|------|--------|
| Confirmar project-ref `.env` / CLI | Feito → `wtbp…` |
| Inventário tabelas/RPCs runtime | Feito |
| Criar projeto novo (A1) | **Cancelado** (desnecessário) |
| Apply `import_profiles` | Feito (SQL prepared) |
| `migration repair` / `db push` completo | **Pendente** — decisão separada (higiene) |
| Onda 1 | Continua bloqueada até gate pós-VAL-01 |

---

## 5. Próximo

→ [FAL_VAL_01_RUNTIME_SCHEMA_2026-10-08.md](./FAL_VAL_01_RUNTIME_SCHEMA_2026-10-08.md)
