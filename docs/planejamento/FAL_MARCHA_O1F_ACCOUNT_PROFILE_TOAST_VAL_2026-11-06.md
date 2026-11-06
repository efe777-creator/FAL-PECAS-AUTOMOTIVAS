# VAL — O1-F: Perfil da conta

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual toast — `AccountProfilePage` usava `message`/`error` só em `<p>`

## Entrega

| Peça | Mudança |
|------|---------|
| `AccountProfilePage` | `pushOk` / `pushError` via `useToast`; sucesso só toast |

## Critérios

- [x] Salvar perfil → toast sucesso
- [x] Validação / falha / encerrar conta → banner + toast
- [x] Sem `<p>` de `message`
- [x] `tsc -b` OK

## Gate humano

Nenhum.
