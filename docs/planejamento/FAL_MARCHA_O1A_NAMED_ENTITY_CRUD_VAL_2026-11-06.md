# VAL — O1-A CRUD genérico + correção badge pagamento

**Data:** 2026-11-06  
**Auth:** MARCHA minuciosa + correção de erros

## Verificação

| Check | Resultado |
|-------|-----------|
| `tsc --noEmit` | OK (após tipagem EntityStatus) |
| `vitest run` | 347 PASS |

## Entregas

| Item | Mudança |
|------|---------|
| `AdminNamedEntityCrud` | Shell nome/slug/status + toast |
| Fabricantes / Montadoras | Páginas finas sobre o shell |
| Fornecedores | Residual (campo código + imports) |
| `AdminOrdersListPanel` | Badge pagamento em PT-BR (`Pendente (expirado)` etc.) |

## Critérios

- [x] Suite verde
- [x] Inventário atualizado

## Residual

- Migrar Fornecedores quando fizer sentido (campo extra)
- Toast residual outras telas

## Gate humano

Nenhum.
