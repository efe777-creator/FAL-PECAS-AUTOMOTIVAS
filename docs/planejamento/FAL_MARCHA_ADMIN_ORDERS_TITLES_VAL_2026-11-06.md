# VAL — Admin pedidos: document.title nas subpáginas

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** titles residual no bloco Pedidos (fora do hub)

## Entrega

| Página | Título |
|--------|--------|
| Lista avançada | `Lista avançada \| Admin FAL` |
| Área operacional | `{area.title} \| Admin FAL` |
| Visão (problemas etc.) | `{view.title} \| Admin FAL` |
| Detalhe | `Pedido {id8} \| Admin FAL` (fallback `Pedido \| Admin FAL`) |

Hub `/admin/pedidos` já coberto no #126.

## Critérios

- [x] `tsc --noEmit` OK
- [x] Hooks antes de early-return em área/visão

## Gate humano

Nenhum nesta fatia.
