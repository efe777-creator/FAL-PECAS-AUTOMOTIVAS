# Execução Fase 3 — Catálogo e estrutura comercial real

**Branch:** `plan`  
**Spec:** [ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md](./ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md)  
**Projeto Supabase:** `wtbpwuiayednvlhvuhbh`

## Checklist de módulos

| Módulo | Status | Notas |
|--------|--------|-------|
| 1 Banco + RLS + Storage | [x] | Migration `20261003200000_fase3_schema_storage.sql` aplicada |
| 2 Backoffice base | [x] | `/admin` + `AdminLayout` + `StaffRoute` |
| 3 Categorias | [x] | CRUD + árvore comercial no banco |
| 4 Montadoras / veículos | [x] | CRUD + 22 montadoras |
| 5 Fabricantes / fornecedores | [x] | CRUD `product_brands` + `suppliers` |
| 6 Produtos | [x] | CRUD + formulário por blocos |
| 7 Referências | [x] | N refs no produto; busca por código |
| 8 Aplicações | [x] | N:N via `product_vehicle_compatibility` |
| 9 Imagens | [x] | Storage `product-images` + admin upload |
| 10 Catálogo público | [x] | Busca SKU/ref + filtros veículo/categoria/fabricante |
| 11 Carga comercial | [x] | Seeds + arquivar fixtures F2 |
| 12 Auditoria final | [x] | Ver `AUDITORIA_FASE3_2026-10-03.md` |

## Migrations

1. `fal-pecas/supabase/migrations/20261003200000_fase3_schema_storage.sql`
2. `fal-pecas/supabase/migrations/20261003210000_fase3_seed_catalog_base.sql`
3. `fal-pecas/supabase/migrations/20261003220000_fase3_seed_commercial_products.sql`

## Arquivos principais (frontend)

- `src/app/StaffRoute.tsx`, `src/app/router.tsx`
- `src/components/admin/AdminLayout.tsx`
- `src/contexts/AuthContext.tsx` (role via `profiles`)
- `src/services/admin/*`
- `src/pages/admin/**`
- `src/services/products/productService.ts`, `vehicles/vehicleService.ts`, `brands/brandService.ts`
- `src/types/index.ts`

## Decisões tomadas

- `products.supplier_id` opcional; `supplier_products` mantido.
- NULL estrito em filtros de veículo (`eq` não casa com NULL).
- Fixtures F2 arquivadas (`status = archived`); não apagadas.
- Admin de catálogo antecipado da Fase 8 (somente catálogo).

## Pré-requisito operacional

Usuário staff: `profiles.role` ∈ `administrador|gerente|operador|estoque|atendimento` para acessar `/admin`.
