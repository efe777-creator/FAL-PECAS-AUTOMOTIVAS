# Banco de dados — FAL Peças Automotivas 3.0

**Status:** Schema Fase 2 aplicado no Supabase  
**Implementação:** `fal-pecas/supabase/migrations/` + [ESPECIFICACAO_FASE2](../planejamento/ESPECIFICACAO_FASE2_ARQUITETURA_DADOS.md)  
**Fonte de verdade (modelo):** este documento + spec Fase 2.  
**PRD:** [FAL_PRD_3.0.md](./FAL_PRD_3.0.md)

---

## 1. Princípios

- SKU = identificador operacional único de produto
- Compatibilidade = **relação** produto ↔ veículo (não texto livre único)
- Preço do item do pedido é preservado no histórico
- Alterações de estoque geram movimentações
- Dados privados protegidos por RLS (`auth.uid()` / roles)
- Entidades só entram se justificadas pelo PRD ou fundação

---

## 2. Diagrama lógico (resumo)

```text
auth.users
  └── profiles ── customers
                    ├── customer_addresses
                    ├── customer_vehicles
                    ├── favorites
                    ├── carts ── cart_items
                    └── orders ── order_items
                                   order_status_history

manufacturers ── models ── (years/engines) ── vehicle_versions
                                              └── product_vehicle_compatibility ── products

product_categories / product_brands ── products ── product_images
products ── inventory ── inventory_movements

suppliers ── supplier_products ── products
imports ── import_items
```

---

## 3. Entidades

### 3.1 profiles

| | |
|--|--|
| **Finalidade** | Extensão de `auth.users` (papel, username, preferências) |
| **Campos** | `id` (PK=auth.users.id), `username` (nullable, unique), `role`, `full_name`, `phone`, `created_at`, `updated_at` |
| **RLS** | Leitura/escrita do próprio usuário; admin roles leem/gerem |
| **Notas** | Login por username = **DECISÃO PENDENTE** (resolver via Edge Function) |

### 3.2 customers

| | |
|--|--|
| **Finalidade** | Dados comerciais do cliente B2C |
| **Campos** | `id`, `profile_id` (FK), `cpf` (nullable até checkout), `cnpj` (nullable), `created_at` |
| **RLS** | Privado — próprio cliente / atendimento / admin |
| **Notas** | CPF opcional no cadastro, exigível no checkout (**DECISÃO PENDENTE** regra fiscal) |

### 3.3 customer_addresses

| | |
|--|--|
| **Finalidade** | Múltiplos endereços do cliente |
| **Campos** | `id`, `customer_id`, `label`, `recipient`, `street`, `number`, `complement`, `district`, `city`, `state`, `postal_code`, `is_default`, `created_at` |
| **RLS** | Privado — próprio cliente |
| **F6C** | `reference` text nullable (ponto de referência opcional) |

### 3.4 customer_vehicles

| | |
|--|--|
| **Finalidade** | Veículos salvos do cliente |
| **Campos** | `id`, `customer_id`, `manufacturer_id`?, `model_id`?, `year`?, `engine`?, `version_id`?, `nickname`, `created_at` |
| **RLS** | Privado — próprio cliente |
| **Notas** | Campos de filtro todos opcionais (espelha UX de busca) |

### 3.5 manufacturers (Montadoras)

| | |
|--|--|
| **Finalidade** | Montadoras (termo UI: **Montadora**, nunca “marca do carro”) |
| **Campos** | `id`, `name`, `slug`, `status` |
| **Público** | Sim (leitura de ativos) |
| **Índices** | unique(`slug`), (`name`) |

### 3.6 models

| | |
|--|--|
| **Finalidade** | Modelos por montadora |
| **Campos** | `id`, `manufacturer_id`, `name`, `slug` |
| **Relacionamento** | N:1 manufacturers |
| **Público** | Sim |

### 3.7 vehicle_years / vehicle_engines (ou atributos em versão)

| | |
|--|--|
| **Finalidade** | Dimensões de filtro Ano e Motor |
| **Campos** | IDs, valores normalizados, FKs para model quando aplicável |
| **DECISÃO PENDENTE** | Modelar como tabelas separadas vs. campos em `vehicle_versions` |

### 3.8 vehicle_versions

| | |
|--|--|
| **Finalidade** | Combinação usable Montadora+Modelo+Ano+Motor+Versão |
| **Campos** | `id`, `manufacturer_id`, `model_id`, `year`, `engine`, `version_name`, `status` |
| **Público** | Sim (ativos) |
| **DECISÃO PENDENTE** | Fonte dos dados de veículos |

### 3.9 product_categories

| | |
|--|--|
| **Finalidade** | Categoria → subcategoria |
| **Campos** | `id`, `parent_id` (nullable), `name`, `slug`, `description`, `sort_order`, `status` |
| **Público** | Sim (publicadas) |

### 3.10 product_brands

| | |
|--|--|
| **Finalidade** | Marcas de peça (não confundir com Montadora) |
| **Campos** | `id`, `name`, `slug` |
| **Público** | Sim |

### 3.11 products

| | |
|--|--|
| **Finalidade** | Catálogo comercial |
| **Campos** | `id`, `sku` (unique), `name`, `slug`, `description`, `brand_id`, `category_id`, `price`, `promo_price`, `status` (draft/published/archived), `manufacturer_code`, `search_document`/`seo_*`, `is_incomplete`, `created_at`, `updated_at` |
| **Índices** | unique(`sku`), unique(`slug`), (`status`), full-text futuro |
| **Público** | Apenas `published` |
| **Regras** | SKU único; produto sem imagem pode existir (`is_incomplete` / flag admin) |
| **Preço (Fase 6B)** | `price` / `promo_price` permanecem como **legado/espelho** na transição. Fonte comercial canônica: `price_lists` + `price_list_items` + `resolve_product_price` — ver [ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md](../planejamento/ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md) |
| **Logística (F6C)** | `weight_kg`, `height_cm`, `width_cm`, `length_cm` nullable — opcionais; sem inventar valores no seed |

### 3.11b store_shipping_origin (F6C)

| | |
|--|--|
| **Finalidade** | CEP/endereço de origem da FAL para cotação |
| **Campos** | cep, street, number, complement?, district?, city, state (1 registro ou settings) |
| **RLS** | Leitura autenticada/staff conforme implementação; escrita staff |

### 3.12 product_images

| | |
|--|--|
| **Finalidade** | Mídia do produto (Storage) |
| **Campos** | `id`, `product_id`, `storage_path`, `alt`, `sort_order`, `is_primary` |
| **Público** | Sim se produto published |

### 3.13 product_vehicle_compatibility

| | |
|--|--|
| **Finalidade** | Relação N:N produto ↔ versão/veículo |
| **Campos** | `id`, `product_id`, `vehicle_version_id` (ou FKs parciais), `notes` |
| **Regra** | Compatibilidade estruturada (PRD §7) |
| **Público** | Sim (leitura) |
| **Índices** | (`product_id`), (`vehicle_version_id`), unique composto |

### 3.14 inventory

| | |
|--|--|
| **Finalidade** | Saldo atual |
| **Campos** | `product_id` (PK/FK), `quantity_on_hand`, `quantity_reserved`, `updated_at` |
| **RLS** | Leitura pública limitada (ex.: disponibilidade booleana) **DECISÃO PENDENTE**; escrita admin/estoque |

### 3.15 inventory_movements

| | |
|--|--|
| **Finalidade** | Histórico de movimentações |
| **Campos** | `id`, `product_id`, `type`, `quantity`, `reason`, `order_id`?, `user_id`?, `created_at` |
| **RLS** | Privado operacional |

### 3.16 carts / cart_items

| | |
|--|--|
| **Finalidade** | Carrinho autenticado (sync futuro) |
| **Campos** | cart: `id`, `customer_id`/`user_id`, `updated_at`; items: `product_id`, `quantity`, `unit_price_snapshot`? |
| **RLS** | Próprio usuário |

### 3.17 orders / order_items / order_status_history

| | |
|--|--|
| **Finalidade** | Pedidos e histórico |
| **Campos pedidos** | `id`, `customer_id`, `status`, `subtotal`, `shipping_amount`, `total`, `address_snapshot`, `payment_ref`?, `created_at` |
| **Campos itens** | `product_id`, `sku`, `name_snapshot`, `unit_price` (preservado), `quantity`; **Fase 6B:** `price_list_id` (lista que originou o unitário) |
| **Status (legado F2/F6 — CHECK atual)** | `pendente` → `aguardando_pagamento` → `pagamento_aprovado` → `em_separacao` → `preparando_envio` → `enviado` → `entregue` / `cancelado` |
| **Ciclo operacional (F6D / F7A)** | Status interno canônico (`recebido`, `em_analise`, `aguardando_disponibilidade`, `aguardando_decisao`, `confirmado`, `em_separacao`, `pronto_para_envio`, `enviado`, `entregue`, `cancelado`) + checkout legado; tabela `order_events` (append-only, visibility internal/customer); RPC `transition_order_status` (staff). Ver [ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md](../planejamento/ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md) e [EXECUCAO_FASE7A.md](../planejamento/EXECUCAO_FASE7A.md) |
| **RLS** | Cliente vê os próprios; operadores/admin conforme role |

### 3.17b price_lists / price_list_items / price_change_history / product_price_overrides (Fase 6B / 6B.1)

| | |
|--|--|
| **Finalidade** | Motor comercial de múltiplas listas de preço + exceção avulsa |
| **Campos listas** | `id`, `name`, `slug` (unique), `description`, `status`, `scope` (`public`\|`assigned`), `priority`, `valid_from`, `valid_until`, `is_default`, timestamps |
| **Campos itens** | `price_list_id`, `product_id`, `price`; **UNIQUE(`price_list_id`,`product_id`)** |
| **Avulso** | `product_price_overrides`: `product_id`, `amount`, `note`, `status` (`active`\|`inactive`), vigência; no máx. um active por produto |
| **Histórico** | `product_id`, `price_list_id` (nullable), `old_price`, `new_price`, `changed_by`, `source` (`manual`\|`import`\|`system`\|`override`), `import_id`? |
| **Regras** | Resolução: **avulso válido** → lista `public` elegível (maior `priority`) → `is_default` → erro. Import CSV/XLSX atualiza só itens da lista (SKU). |
| **RLS** | Preço público só via resolução/`scope=public`; listas `assigned` não listáveis anonimamente; escrita staff |
| **Spec** | [ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md](../planejamento/ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md) · [EXECUCAO_FASE6B1.md](../planejamento/EXECUCAO_FASE6B1.md) |

### 3.18 favorites

| | |
|--|--|
| **Finalidade** | Favoritos do cliente |
| **Campos** | `user_id`, `product_id`, `created_at` — unique(`user_id`,`product_id`) |
| **RLS** | Próprio usuário |

### 3.19 suppliers / supplier_products

| | |
|--|--|
| **Finalidade** | Fornecedores (incl. possível HF como supplier) |
| **Campos** | suppliers: `id`, `name`, `code`, `status`; supplier_products: `supplier_id`, `product_id`, `supplier_sku`, `cost`? |
| **RLS** | Admin/operacional |
| **DECISÃO PENDENTE** | Modelo de integração HF |

### 3.20 imports / import_items

| | |
|--|--|
| **Finalidade** | Importação Excel/CSV |
| **Campos** | import: `id`, `filename`, `status`, `created_by`, `report`; items: linha, erros, avisos, payload, resultado upsert |
| **Fase 6B** | Uso para importação de **preços por lista** (`kind`/metadata + `price_list_id` no report); pipeline upload→validação→preview→confirmação. Importador genérico de catálogo permanece Fase 8 |
| **RLS** | Admin/operacional |

### 3.21 payments / shipments

| | |
|--|--|
| **Finalidade** | Pagamento e entrega |
| **Status** | **DECISÃO PENDENTE** (gateway / frete — PRD §18) |
| **Campos** | Placeholder até decisão de provedores |

---

## 4. RLS (planejamento preservado)

| Área | Leitura | Escrita |
|------|---------|---------|
| products published | público | admin roles |
| carts / cart_items | próprio usuário | próprio usuário |
| orders | próprio usuário | próprio + operadores |
| profiles / customers / addresses | próprio usuário | próprio usuário |
| admin / imports / inventory_movements | roles admin/estoque | roles admin/estoque |

Não criar policies permissivas em dados privados só para desbloquear UI.

**Nota Fase 2 (auditoria):** policies staff de catálogo não podem ser `FOR ALL` com `is_staff()` —
o Postgres avalia todas as policies permissivas e o `anon` quebrava com
`permission denied for function is_staff`. Staff = SELECT/INSERT/UPDATE/DELETE separados
(`TO authenticated`); leitura pública só checa `status`.

---

## 5. Decisões

**Fechadas na Fase 2**

- Ano/Motor/Versão: campos em `vehicle_versions`
- Loja pública: só `products.is_available` (quantidade restrita a staff)
- Códigos: tabela `product_references`
- `payments` / `shipments`: placeholders sem provedor

**Ainda pendentes**

- Fonte dos dados de veículos
- Gateway pagamento / frete
- Integração HF via `suppliers`
- Regras fiscais CPF/CNPJ

---

## Confirmação

**Fase 2:** tabelas + RLS aplicadas no projeto Supabase. Seed estrutural mínimo inserido (categorias, montadoras, 2 produtos fixture). Catálogo comercial real = Fase 3.

## Preservado do rascunho

Lista de entidades e tabela RLS de `fal-pecas/docs/data-model-future.md` foram incorporadas e expandidas neste documento.
