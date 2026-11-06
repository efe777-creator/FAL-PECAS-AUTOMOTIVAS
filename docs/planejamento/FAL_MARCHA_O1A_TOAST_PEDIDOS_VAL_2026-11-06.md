# VAL — O1-A toast admin (pedidos)

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** Toast admin — consolidar gradualmente

## Entrega

| Página | Mudança |
|--------|---------|
| Hub / Lista / Área | Feedback de “Retirar não pagos” via `useToast` (success/error) |
| Load errors | Permanecem em `ErrorState` / painel (falha estrutural da tela) |

## Critérios

- [x] Sem `<p>` de `message` pós-expire nas 3 telas
- [x] `tsc --noEmit` OK
- [x] Inventário atualizado (parcial)

## Residual

Demais admin (`AdminCategoriesPage`, frete, etc.) ainda usam `info`/`error` inline.
