# VAL — Onda 2 residual: SEO Home + Veículo

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** `/veiculo` sem `document.title`; Home sem JSON-LD Organization/WebSite; `OrdersPage` legado com copy “fase”

## Entrega

| Peça | Mudança |
|------|---------|
| `VehiclePage` | `useDocumentTitle('Busca por veículo \| …')` |
| `HomePage` | JSON-LD `@graph` Organization + WebSite (SearchAction → `/catalogo?q=`) |
| `OrdersPage` | Redirect para `/conta/pedidos` (remove jargão “RLS futuro”) |

## Critérios

- [x] Title correto em `/veiculo`
- [x] `#fal-home-jsonld` na Home
- [x] `tsc -b` OK

## Gate humano

Nenhum nesta fatia.
