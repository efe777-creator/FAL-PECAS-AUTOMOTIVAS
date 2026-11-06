# VAL — “Carregar mais” sem pular ao topo + scroll inteligente

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** clicar em “Carregar mais” no catálogo subia a página ao início

## Causa

`ScrollToTop` reagia a mudança de `navType` (`PUSH` → `REPLACE` ao gravar `?page=`), não só a `pathname`.

## Entrega

| Peça | Mudança |
|------|---------|
| `ScrollToTop` | Rola ao topo só se o **pathname** mudou (ignora troca só de search / REPLACE do page) |
| `catalogScroll` | Chave ignora `page` — memória de scroll sobrevive ao “Carregar mais” |
| `CatalogPage` | Filtro/busca/sort leva aos resultados; load more preserva Y; POP restaura posição |

## Critérios

- [x] “Carregar mais” mantém a posição na página
- [x] Voltar da PDP restaura scroll (incl. após ter carregado mais páginas)
- [x] Trocar filtro ainda leva à área de resultados
- [x] `vitest` `catalogScroll.test.ts` OK

## Gate humano

Nenhum nesta fatia.
