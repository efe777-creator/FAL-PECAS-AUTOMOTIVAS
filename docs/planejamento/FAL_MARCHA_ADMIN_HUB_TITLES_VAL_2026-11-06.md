# VAL — Admin hub: document.title no menu principal

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** titles residual no hub admin (nav `AdminLayout`)

## Entrega

`useDocumentTitle('… | Admin FAL')` nos hubs do menu que ainda não tinham:

| Rota | Título |
|------|--------|
| `/admin` | Dashboard |
| `/admin/precos` | Preços |
| `/admin/categorias` | Classificação |
| `/admin/home` | Home da loja |
| `/admin/montadoras` | Montadoras |
| `/admin/veiculos` | Veículos |
| `/admin/fabricantes` | Fabricantes |
| `/admin/fornecedores` | Fornecedores |
| `/admin/pedidos` | Pedidos |
| `/admin/clientes` | Clientes |
| `/admin/logistica` | Logística |
| `/admin/relatorios` | Relatórios |
| `/admin/operadores` | Operadores |

Já cobertos antes: Produtos, Aplicações, Importações, Estoque.

## Critérios

- [x] `tsc --noEmit` OK
- [x] Padrão alinhado à loja (`useDocumentTitle`)

## Fora desta fatia

Subpáginas (detalhe pedido, form produto, wizards, ME/caixas/frete próprio, prep IA).

## Gate humano

Nenhum nesta fatia.
