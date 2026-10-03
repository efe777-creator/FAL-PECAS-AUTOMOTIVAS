# Especificação — Fase 2: Arquitetura de Dados e Estrutura Funcional

**Status:** Em execução  
**Data:** 2026-10-03  
**Base:** [DATABASE.md](../entrada/DATABASE.md), [UX.md](../entrada/UX.md), [API.md](../entrada/API.md)  
**Roadmap:** [ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md)

---

## 1. Objetivo

Definir e aplicar a estrutura interna que permite a FAL crescer sem reconstruir o banco: relações, categorias administráveis, veículos, clientes e contratos das telas com esses dados.

**Fase 2 prepara a máquina. Fase 3 coloca o conteúdo comercial real.**

---

## 2. Decisões fechadas nesta fase

| Tema | Decisão |
|------|---------|
| Ano / Motor / Versão | Campos em `vehicle_versions` (`year`, `engine`, `version_name`). Sem tabelas de dimensão separadas por enquanto. |
| Estoque na loja | Público vê apenas **disponibilidade** (`is_available`). Quantidade exata só roles operacionais. |
| Referências / códigos | Tabela `product_references` (`code`, `ref_type`, `brand_label`). |
| Pagamento / frete | Tabelas placeholder `payments` / `shipments` sem provedor (Fases 6/9). |
| Categorias | Árvore via `parent_id` — fonte de verdade no banco, não no código. |
| Seed | Estrutural mínimo (categorias, montadoras, 1–2 produtos fixture). Catálogo real = Fase 3. |

Decisões que **permanecem abertas** (não bloqueiam F2): fonte definitiva de veículos, gateway, frete, integração HF, regras fiscais CPF/CNPJ.

---

## 3. Modelo de dados (resumo)

```text
auth.users
  └── profiles ── customers
                    ├── customer_addresses
                    ├── customer_vehicles
                    ├── favorites
                    ├── carts ── cart_items
                    └── orders ── order_items
                                   order_status_history

manufacturers ── models ── vehicle_versions
                              └── product_vehicle_compatibility ── products

product_categories (parent_id)
product_brands ── products ── product_images
                           ── product_references
products ── inventory ── inventory_movements
suppliers ── supplier_products
imports ── import_items
payments / shipments (placeholder)
```

Relações críticas:

- Produto → N aplicações (`product_vehicle_compatibility`)
- Produto → N códigos (`product_references`)
- Produto → N imagens (`product_images`)
- Produto → 1 categoria (`product_categories`)
- Veículo (versão) → N produtos (via compatibilidade)

Migrations: `fal-pecas/supabase/migrations/`.

---

## 4. Matriz tela ↔ dados

| Tela / fluxo | Dados | Origem Fase 2 | Mock até |
|--------------|-------|---------------|----------|
| Home — categorias | Categorias publicadas (raiz) | `product_categories` via `categoryService` | — |
| Home — destaques | Produtos published | `products` (+ disponibilidade) | Seed; catálogo real F3 |
| Nav categorias | Categorias raiz | DB | — |
| Catálogo | Filtros query + grid | Services; grid pode ficar vazio/seed | Filtros avançados F4 |
| Produto | Detalhe, refs, compat, disponibilidade | `products` + joins | Galeria rica F3 |
| Busca textual | q → lista | Service simples (ilike/refs); FTS F4 | F4 |
| Veículo | Opções montadora/modelo/ano/motor | `manufacturers` / `models` / `vehicle_versions` | — |
| Conta | Sessão + profile | Auth + `profiles` | Endereços F5 |
| Favoritos | — | Schema pronto | UI F5 |
| Carrinho | Itens locais | localStorage; tabelas `carts` prontas | Sync F6 |
| Checkout | Steps UI | Schema `orders` pronto | Fluxo F6 |
| Pedidos | Lista do cliente | Schema pronto | UI F5/F6 |
| Back office | — | Só desenho de entidades | F8 |

---

## 5. RLS (princípios)

- Catálogo publicado: leitura `anon` / `authenticated`
- Inventário quantidade: **sem** leitura pública; view/função só `is_available`
- Perfis, clientes, endereços, veículos salvos, favoritos, carrinhos, pedidos: próprio usuário (`auth.uid()`)
- Imports, movimentações, suppliers: roles staff
- Proibido `USING (true)` em dados privados

Helper: `public.is_staff()`, `public.current_customer_id()`.

---

## 6. Escopo de implementação

1. Migrations SQL + RLS no Supabase  
2. Seed estrutural mínimo  
3. Types + services lendo Postgres (fallback mock só se Supabase não configurado)  
4. Nav/Home consumindo categorias do banco  
5. Trigger `auth.users` → `profiles` + `customers`

---

## 7. Critérios de saída

- [x] Spec aprovada / em execução  
- [x] Schema + RLS aplicados  
- [x] Relações críticas cobertas  
- [x] Matriz tela↔dados documentada  
- [x] App lê categorias/produtos/veículos via services  
- [x] Categorias não são fonte de verdade hardcoded  

---

## 8. Explicitamente fora da Fase 2

Catálogo comercial massivo, motor de busca avançado, checkout real, painel admin, importação Excel, gateways.
