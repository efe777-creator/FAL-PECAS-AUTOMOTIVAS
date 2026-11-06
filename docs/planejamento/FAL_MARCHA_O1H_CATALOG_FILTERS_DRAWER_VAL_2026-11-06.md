# VAL — O1-H residual: filtros do catálogo em MobileDrawer

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** plano mestre #14 / O1-H — mobile empilhava filtros sem drawer

## Entrega

| Peça | Mudança |
|------|---------|
| Catálogo mobile (`< lg`) | Botão `Filtros` / `Filtros (N)` + `MobileDrawer` com classificação, veículo e quick-pick |
| Desktop (`lg+`) | Mantém grade + details de veículo inline |
| Sticky contagem | Corrige classe inválida `bg-[#f4f6f8]/px-1` → `bg-[#f4f6f8] px-1` |

N = chips ativos exceto a busca textual (já tem form próprio).

## Critérios

- [x] `tsc --noEmit` OK
- [x] Reusa `MobileDrawer` existente (header/menu)

## Gate humano

Nenhum nesta fatia.
