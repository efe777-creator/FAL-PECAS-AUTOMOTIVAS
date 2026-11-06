# VAL — O1-F: Endereços da conta

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual toast — `AccountAddressesPage` usava `message`/`error` só em `<p>`

## Entrega

| Peça | Mudança |
|------|---------|
| `AccountAddressesPage` | `pushOk` / `pushError` via `useToast`; sucesso só toast |

## Critérios

- [x] Cadastrar / atualizar / padrão / excluir → toast
- [x] Erros → banner + toast
- [x] Sem `<p>` de `message`
- [x] `tsc -b` OK

## Gate humano

Nenhum.
