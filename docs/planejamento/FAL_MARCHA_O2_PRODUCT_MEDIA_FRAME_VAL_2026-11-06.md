# VAL — Enquadramento de fotos (contain sem borda feia)

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** Fotos nos cards/PDP/busca/carrinho cortavam ou mostravam “moldura” cinza no letterbox

## Entrega

| Peça | Mudança |
|------|---------|
| `ProductMediaFrame` | Frame compartilhado: `object-contain` + fundo `#f8f9fa` + padding interno (sem gradiente cinza) |
| `ProductCard` | Usa o frame (catálogo / carrosséis) |
| `ProductGallery` | Área principal + thumbs com o mesmo padrão |
| `SearchBar` | Thumb de sugestão sem borda cinza |
| `CartPage` | Thumb do item alinhado ao mesmo critério |

## Critérios

- [x] Foto não é cortada (`object-contain` / `max-h/w-full`)
- [x] Sem faixa/moldura cinza gradiente no letterbox
- [x] Padding leve para a peça “respirar” sem parecer stamp

## Gate humano

Nenhum nesta fatia — validar visual no catálogo/PDP após deploy.
