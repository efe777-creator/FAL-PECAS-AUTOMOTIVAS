# VAL — O1-A / O0-C: clientes admin

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual toast + copy — `AdminCustomersPage` sem `useToast`; jargão F8/CRM/role

## Entrega

| Peça | Mudança |
|------|---------|
| Toast | Erros de carga / carregar mais / abrir detalhe via `pushError` |
| Copy | Permissão e descrição sem F8/CRM/role |

## Critérios

- [x] Erro dispara banner + toast
- [x] Sem “F8”, “CRM”, “role atendimento” no texto renderizado
- [x] `tsc -b` OK

## Gate humano

Nenhum.
