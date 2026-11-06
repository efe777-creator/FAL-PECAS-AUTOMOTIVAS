# VAL — O1-A / O0-C: liberar produto no form

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual — `AdminProductFormPage` salvava com toast, mas “Liberar na loja” só usava `<p>`/`message`; dialog com jargão `published`/`Hard`

## Entrega

| Peça | Mudança |
|------|---------|
| Liberar | `pushOk` / `pushError` via toast |
| Copy | Dialog sem “Hard” / “published” |
| UI | Remove `<p>` de `message` |

## Critérios

- [x] Liberar com sucesso → toast
- [x] Checklist/falha → banner + toast
- [x] Sem `message` inline
- [x] `tsc -b` OK

## Gate humano

Nenhum.
