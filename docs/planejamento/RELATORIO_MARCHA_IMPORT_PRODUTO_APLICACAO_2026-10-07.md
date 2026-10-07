# Relatório de marcha — Import Produto × Aplicação (+ HF)

**Data:** 2026-10-07  
**Status:** STOP — sem commit/push

## Entregue

### Spec
- `docs/planejamento/ESPECIFICACAO_IMPORT_PRODUTO_APLICACAO_2026-10-07.md` — contratos A/B/C, gates e fluxo HF.

### Frente A — Produtos
- Contrato `catalog`: sku, nome, categoria, grupo, subgrupo?, descrições? (sem montadora).
- Motor `productImportCore` (consolidação 1 SKU + payload congelado).
- Service/UI: `adminCatalogImportService` + `AdminProductImportPage`.
- RPC `apply_catalog_products_import` (migration `20261007150000_*`) — aplicada no remoto.
- Novos: draft / indisponível / price=0; hierarquia categoria→grupo→subgrupo.

### Frente B — Aplicações
- Contrato: nome opcional; montadora/modelo obrigatórios.
- Motor: SKU inexistente → `error`; `createProduct` sempre `false`.
- RPC endurecida (`20261007160000_apps_import_no_create_product`) — **não cria produto**; aplicada no remoto.

### Frente C — HF
- Contrato bundle + `splitHfMappedRows` / consolidação.
- Wizard `AdminHfBundleImportPage` + `adminHfBundleImportService`.
- Dois `imports` + apply sequencial (produto → apps); falha parcial reportada.

## Gates

| Gate | Resultado |
|------|-----------|
| vitest `src/services/import` | 62 passed |
| tsc + vite build | OK |
| RPCs remotas | `apply_catalog_products_import` + `apply_catalog_applications_import` (sem create product) |
| Commit/push | **não feitos** (STOP) |

## Rotas UI
- `/admin/produtos/importar`
- `/admin/produtos/importar-aplicacoes`
- `/admin/produtos/importar-hf`

## Fora desta marcha (conforme plano)
- Fabricante peça / preço / estoque
- RPC bundle atômica produto+aplicação
- Permissões F / MP G
