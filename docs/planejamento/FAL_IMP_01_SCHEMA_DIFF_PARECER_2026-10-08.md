# FAL-IMP-01 — Diff schema Git × remoto + parecer D-SCHEMA

**Data:** 2026-10-08  
**Comando:** `FAL-IMP-01` (Onda 0 — gate aprovado)  
**Modo:** investigação + parecer + proposta mínima  
**Apply destrutivo:** **NÃO EXECUTADO** — requer confirmação explícita do eFe  
**Fora de escopo (congelado):** pricing UI, catálogo, pedidos, estoque, imports, UX  

> **CORREÇÃO (mesmo dia):** o MCP auditou o projeto **HF** `owllmfcpbodqmoerdfxx`.  
> O runtime da app é **`wtbpwuiayednvlhvuhbh`** (já em linhagem `fase*`).  
> Ver **[ADENDO RUNTIME](./FAL_IMP_01_ADDENDUM_RUNTIME_CANONICO_2026-10-08.md)** e **[VAL-01](./FAL_VAL_01_RUNTIME_SCHEMA_2026-10-08.md)**.  
> As seções abaixo permanecem válidas para o projeto HF; **não** usá-las sozinhas para decidir A1/A2 no banco da loja.

**Refs:**  
- [PLANO_CORRECAO](./AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md)  
- [FIND-001](./AUDITORIA_FAL_FASE0_FINDINGS_2026-10-08.md)  
- Migrations locais: `fal-pecas/supabase/migrations/` (52 arquivos `fase*` / follow-ups)  
- Projeto auditado via MCP (HF): `owllmfcpbodqmoerdfxx`  
- Projeto runtime (canônico): `wtbpwuiayednvlhvuhbh`

---

## 0. Respostas objetivas (checklist IMP-01)

| # | Pergunta | Resposta curta |
|---|----------|----------------|
| 1 | Schema real remoto hoje? | Linhagem **HF F1** (`hf_f1_*`) + patches import/search; catálogo + B2B HF; **sem** e-commerce F6–F8 |
| 2 | O que existe nas migrations `fase*` do Git? | Arquitetura FAL B2C completa: catálogo + preços + carrinho + pedidos + estoque + frete/pagamento |
| 3 | Onde divergem? | Histórico de migrations incompatível; 16 tabelas só no Git; 6 tabelas B2B só no remoto; `customers` com **schemas incompatíveis** |
| 4 | Obrigatórios vs presentes? | Ver §4 — críticos ausentes: `orders*`, `carts*`, `inventory*`, `product_price_overrides`, `place_order`, `resolve_product_price`, … |
| 5 | Opção 1 D-SCHEMA viável? | **Como alvo arquitetural: SIM.** **Como `db push` cego no remoto atual: NÃO** (conflito destrutivo em `customers` + histórico `hf_*`) |
| 6 | Menor conjunto de alterações? | Ver §6 — caminho recomendado: **projeto canônico limpo com `fase*`** + migração de dados de catálogo, **ou** pacote aditivo com reshape controlado de `customers` |
| 7 | Alteração destrutiva? | **SIM, se reaplicar fase2 `customers` no remoto atual.** **PARAR** — aguardar confirmação eFe (§7) |

---

## 1. Qual é o schema real remoto hoje

### 1.1 Identidade do projeto

| Fonte | Project ref | Notas |
|-------|-------------|-------|
| MCP `list_projects` / SQL Fase 0–IMP-01 | `owllmfcpbodqmoerdfxx` | Único projeto acessível na org; criado 2026-10-07; sa-east-1 |
| CLI local `fal-pecas/supabase/.temp/project-ref` | `wtbpwuiayednvlhvuhbh` | **Outro ref**; MCP retorna sem permissão — **risco de env apontar para projeto diferente do auditado** |

**Ação obrigatória antes de qualquer apply:** confirmar qual `VITE_SUPABASE_URL` / project a app usa em runtime e unificar com o canônico.

### 1.2 Histórico de migrations remotas (MCP)

```text
hf_f1_01_core … hf_f1_08_admin_operators_rpc_fix
hf_search_products_b2b
06_import_pipeline_schema
apply_catalog_* / apply_supplier_* / apply_price_list_import (duplicatas de versão)
07_storage_product_images … 11_hf_categories_scope
```

**Nenhuma** migration `20261003*`–`20261006*` `fase*` do Git aparece no histórico remoto.

### 1.3 Tabelas `public` remotas (25)

```text
catalogs, catalog_products,
customer_groups, customer_group_catalogs, customer_catalogs, customer_users, customers,
import_items, import_profiles, imports,
manufacturers, models, vehicle_versions,
price_change_history, price_list_items, price_lists,
product_brands, product_categories, product_images, product_references,
product_vehicle_compatibility, products, profiles,
supplier_products, suppliers
```

### 1.4 RPCs remotas relevantes (21)

Presentes (amostra): `search_products`, `apply_catalog_products_import`, `apply_catalog_applications_import`, `apply_supplier_*`, `apply_price_list_import`, `recalculate_calculated_for_products`, `admin_*_operator*`, `is_staff`, `staff_can_import_catalog`, `customer_can_see_product`, `current_customer_ids`, …

**Ausentes no remoto (existem no Git):** `place_order`, `resolve_product_price`, `resolve_product_prices`, `transition_order_status`, `confirm_simulated_payment`, `confirm_mercadopago_payment`, `get_store_inventory_mode`, `set_store_inventory_mode`, `adjust_inventory`, `admin_orders_basic_totals`, `admin_order_status_counts`, `product_base_cost`, `recalculate_price_list_items`, `set_price_list_item_pricing`, `current_customer_id` (singular), …

### 1.5 Dados (snapshot)

| Métrica | Valor |
|---------|------:|
| products | 52 (quase todos published; 1 available) |
| price_list_items com preço | ~1 |
| supplier_products com custo | 0 |
| PVC | ~1 produto |
| Listas | Preço Base + Promocional (priority 100) |

### 1.6 Conflito estrutural: `customers`

| | Git `fase2` | Remoto HF |
|--|-------------|-----------|
| Modelo | B2C: `profile_id` → `profiles`/`auth.users` | B2B: `legal_name`, `trade_name`, `group_id`, sem `profile_id` |
| App atual | `customerService` usa `profile_id` | Schema remoto **não tem** `profile_id` |

Isso sozinho impede reaplicar `fase2_schema_rls.sql` “em cima” do remoto sem DROP/reshape.

---

## 2. O que existe nas migrations `fase*` do Git

### 2.1 Contagem

- **52** arquivos SQL em `fal-pecas/supabase/migrations/`
- **0** arquivos `hf_*` no Git
- Extração: **36** tabelas criadas; **~64** functions `create or replace`

### 2.2 Tabelas canônicas Git (alvo FAL)

| Domínio | Tabelas |
|---------|---------|
| Conta B2C | `profiles`, `customers` (profile_id), `customer_addresses`, `customer_vehicles` |
| Catálogo | `product_categories`, `product_brands`, `products`, `product_images`, `product_references`, `product_vehicle_compatibility` |
| Veículos | `manufacturers`, `models`, `vehicle_versions` |
| Supply/import | `suppliers`, `supplier_products`, `imports`, `import_items`, `import_profiles` |
| Preços | `price_lists`, `price_list_items`, `price_change_history`, `product_price_overrides` |
| Carrinho | `carts`, `cart_items`, `favorites` |
| Pedidos | `orders`, `order_items`, `order_status_history`, `order_events` |
| Estoque | `inventory`, `inventory_movements`, `store_settings` |
| Pagamento/frete | `payments`, `payment_events`, `shipments`, `store_shipping_origin` |

**Nomenclatura Git = alinhada ao app:** `product_categories` (não `categories`); `manufacturers` (não `vehicle_makes`).

### 2.3 RPCs canônicas (obrigatórias para a app atual)

| Grupo | RPCs |
|-------|------|
| Catálogo | `search_products` |
| Preço | `resolve_product_price`, `resolve_product_prices`, `product_base_cost`, `recalculate_*`, `set_price_list_item_pricing`, … |
| Pedido | `place_order`, `transition_order_status`, `confirm_simulated_payment`, `confirm_mercadopago_payment` |
| Estoque | `get_store_inventory_mode`, `set_store_inventory_mode`, `adjust_inventory` |
| Import | `apply_catalog_products_import` / `apply_catalog_import`, `apply_*` |
| Admin | `admin_order_status_counts`, `admin_orders_basic_totals`, `admin_set_user_role`, … |
| Auth helpers | `is_staff`, `current_customer_id`, `handle_new_user` |

### 2.4 Prepared / gated no Git

Arquivos `*_prepared.sql` existem com SQL real mas marcados para apply controlado (`import_profiles`, MP foundation, L3 seed, etc.). Não são no-op.

---

## 3. Diff — onde os dois divergem

### 3.1 Histórico

| | Remoto | Git |
|--|--------|-----|
| Prefixo | `hf_f1_*` + patches 07/10 | `20261003*`…`20261007*` `fase*` |
| Interseção de versões | **vazia** | — |

### 3.2 Tabelas só no remoto (HF B2B — não no Git)

```text
catalogs, catalog_products,
customer_groups, customer_group_catalogs, customer_catalogs, customer_users
```

### 3.3 Tabelas só no Git (ausentes no remoto)

```text
carts, cart_items, favorites,
customer_addresses, customer_vehicles,
orders, order_items, order_status_history, order_events,
inventory, inventory_movements, store_settings,
payments, payment_events, shipments, store_shipping_origin,
product_price_overrides
```

### 3.4 Interseção com risco de drift de colunas

| Tabela | Risco |
|--------|-------|
| `customers` | **Incompatível** (B2C vs B2B) |
| `price_list_items` | Remoto tem `price_origin`/`calculated_price`; pode faltar colunas de markup/extra% das migrations posteriores — validar no apply |
| `products` | Parece compatível no núcleo (`sku`, `status`, `is_available`, `posicao`, `lado`) |
| `imports` | Remoto tem colunas extras (`filename`, `report`) — geralmente ok |

### 3.5 Funções

| Situação | Exemplos |
|----------|----------|
| Só remoto (B2B) | `customer_can_see_product`, `current_customer_ids` |
| Só Git (app depende) | `place_order`, `resolve_product_price`, lifecycle pedido, estoque, MP confirm |
| Ambos (podem divergir no corpo) | `search_products`, `apply_*`, `recalculate_calculated_for_products` |

### 3.6 App × banco

O código em `fal-pecas/src` **assume o modelo Git** (`place_order`, `orders`, `carts`, `customer_addresses`, `product_price_overrides`, `resolve_product_price`, `customers.profile_id`).  
Contra o remoto MCP atual, carrinho/checkout/pedidos/estoque/overrides **não têm base**.

---

## 4. Inventário obrigatório vs presente

Legenda: **OK** presente · **AUSENTE** · **CONFLITO**

### 4.1 Tabelas obrigatórias (app FAL atual)

| Objeto | Remoto | Severidade se ausente |
|--------|--------|------------------------|
| `products` + catálogo PVC/categorias/brands | OK | — |
| `price_lists` / `price_list_items` | OK (parcial) | P1 formação |
| `product_price_overrides` | AUSENTE | P1 preço |
| `imports` / `import_items` | OK | — |
| `suppliers` / `supplier_products` | OK | — |
| `customers` (profile_id) | **CONFLITO** | P0 conta/checkout |
| `customer_addresses` / `customer_vehicles` | AUSENTE | P0 checkout/conta |
| `carts` / `cart_items` | AUSENTE | P0 carrinho |
| `favorites` | AUSENTE | P2 |
| `orders` (+ items/events/history) | AUSENTE | P0 pedidos |
| `inventory` (+ movements) / `store_settings` | AUSENTE | P1 estoque |
| `payments` / `payment_events` | AUSENTE | P0 pagamento |
| `shipments` / `store_shipping_origin` | AUSENTE | P1 frete |
| `catalogs` / `customer_groups` (HF) | Só remoto | Não obrigatório para app B2C atual |

### 4.2 RPCs obrigatórias

| RPC | Remoto |
|-----|--------|
| `search_products` | OK (corpo pode diferir) |
| `resolve_product_price` / `resolve_product_prices` | **AUSENTE** |
| `place_order` | **AUSENTE** |
| `transition_order_status` | **AUSENTE** |
| `confirm_simulated_payment` / `confirm_mercadopago_payment` | **AUSENTE** |
| `get/set_store_inventory_mode`, `adjust_inventory` | **AUSENTE** |
| `apply_*` imports | OK (parcial) |
| `admin_orders_*` | **AUSENTE** |
| `current_customer_id` | **AUSENTE** (existe `current_customer_ids`) |
| `product_base_cost` / `recalculate_price_list_items` | **AUSENTE** / parcial |

---

## 5. Parecer D-SCHEMA

### Hipótese preferencial (gate): Opção 1 — migrations `fase*` como canônicas

**Veredito:**

| Critério | Resultado |
|----------|-----------|
| As `fase*` representam a arquitetura pretendida do FAL (app + PRD)? | **SIM** |
| O remoto atual já é essa arquitetura? | **NÃO** |
| Dá para “só rodar as migrations do Git” no projeto `owllmfcpbodqmoerdfxx`? | **NÃO sem destruição/conflito** |
| Opção 2 (remoto HF oficial) | **Rejeitada como default** — cristaliza B2B HF e fura o app B2C; HF deve continuar **fonte, não dono** |
| Opção 3 (projeto limpo) | **Equivalente prático recomendado** para materializar a Opção 1 com segurança |

### Interpretação oficial do parecer

> **Opção 1 permanece o alvo canônico.**  
> A forma segura de realizá-la, dado o estado do remoto, é **novo projeto (ou reset controlado) aplicando a cadeia `fase*` do Git**, seguido de **migração de dados** (produtos, categorias, veículos, listas/itens, imports úteis) a partir do remoto atual — **não** um push cego sobre o schema HF.

Isso é Opção 1 no espírito + Opção 3 na mecânica de implantação.

---

## 6. Menor conjunto de alterações (proposta — sem apply nesta marcha)

### Caminho A — recomendado (canônico limpo)

1. Confirmar project-ref de runtime (MCP vs `.temp`).  
2. Criar **projeto Supabase canônico FAL** (ou branch DB) vazio.  
3. Aplicar migrations Git **em ordem** (`fase2` → … → follow-ups 07/10), incluindo `*_prepared` necessários ao runtime.  
4. Script/ETL de dados do remoto atual → canônico:  
   - `product_categories`, `product_brands`, `products`, imagens/refs  
   - `manufacturers` / `models` / `vehicle_versions` / PVC  
   - `suppliers` / `supplier_products`  
   - `price_lists` / `price_list_items` (mapear colunas)  
   - **Não** migrar `customers` B2B como se fossem B2C sem transformação  
5. Apontar app (`VITE_SUPABASE_*`) + CLI link para o canônico.  
6. `FAL-VAL-01` no canônico.  
7. Remoto HF antigo: manter read-only / arquivo até validação — **não** apagar sem OK.

### Caminho B — aditivo no remoto atual (maior risco)

1. Criar tabelas ausentes (cart/orders/inventory/…) com SQL derivado das `fase*`.  
2. **Reshape `customers`**: adicionar `profile_id`, migrar/relacionar B2B — **destrutivo/ambíguo**.  
3. Instalar RPCs faltantes (`place_order`, `resolve_product_price`, …).  
4. Decidir destino das tabelas HF (`catalogs`, `customer_groups`): manter órfãs ou dropar depois.  
5. Convivência de dois modelos de cliente até limpeza — alto custo de manutenção.

**Parecer:** preferir **Caminho A**. Caminho B só se eFe exigir manter o mesmo project ref a qualquer custo.

### O que NÃO fazer nesta Onda 0

- Não “já corrigir” pricing/liberar/import UI.  
- Não dropar tabelas HF sem confirmação.  
- Não aplicar `fase2` inteiro no remoto HF.  
- Não liberar Onda 1.

---

## 7. STOP — alteração destrutiva (confirmação eFe)

Qualquer um dos itens abaixo **exige OK explícito** antes de executar:

1. DROP/reshape da tabela `customers` (ou dados B2B).  
2. DROP das tabelas HF (`catalogs`, `customer_groups`, …).  
3. Reset do projeto `owllmfcpbodqmoerdfxx`.  
4. Troca do project-ref da app em produção/Netlify.  
5. Apagar dados de produtos no remoto atual.

**Nesta marcha IMP-01: nenhum dos itens acima foi executado.**

### Decisão solicitada ao eFe

Escolher **uma**:

| Opção | Descrição |
|-------|-----------|
| **A1** | Criar projeto canônico novo + aplicar `fase*` + migrar dados de catálogo (recomendado) |
| **A2** | Reset controlado do projeto atual `owllmfcpbodqmoerdfxx` + aplicar `fase*` (destrutivo no projeto atual; backup/export antes) |
| **B** | Pacote aditivo no remoto HF (aceitar dívida B2B + reshape `customers`) — não recomendado |

Também confirmar: **qual project-ref a app usa hoje** (`owll…` vs `wtbp…`).

---

## 8. Entregáveis produzidos nesta marcha

| Entregável | Status |
|-------------|--------|
| Diff Git × remoto | Este documento §1–3 |
| Inventário obrigatório vs presente | §4 |
| Parecer D-SCHEMA | §5 |
| Proposta mínima | §6 |
| Apply schema | **Não** — STOP §7 |
| Onda 1 | **Não iniciada** |

---

## 9. Checklist para `FAL-VAL-01` (após alinhamento aprovado)

Executar só no **projeto canônico alinhado**:

- [ ] `list_migrations` reflete cadeia `fase*` (ou equivalência documentada)  
- [ ] Tabelas §4.1 todas OK (sem conflito `customers`)  
- [ ] RPCs §4.2 todas OK  
- [ ] Smoke SQL: `search_products`, `resolve_product_price` (1 sku), `place_order` em sandbox  
- [ ] App local aponta para o mesmo project-ref  
- [ ] Contagem produtos migrados coerente  
- [ ] Sem dependência runtime de tabelas HF B2B  
- [ ] Relatório VAL-01 + pedido de gate Onda 1

---

## 10. Atualização de status

| Item | Estado |
|------|--------|
| FAL-IMP-01 (diff + parecer) | **Concluído** |
| Apply / alinhamento físico | **Bloqueado — aguarda decisão A1/A2/B** |
| FAL-VAL-01 | Aguardando alinhamento |
| Onda 1 | Bloqueada |

**Próximo passo:** eFe escolhe A1 / A2 / B (+ confirma project-ref). Só então executar o alinhamento mínimo e `FAL-VAL-01`.
