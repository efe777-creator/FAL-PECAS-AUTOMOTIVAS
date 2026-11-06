# VAL — O1-I: Dashboard sem zeros falsos no loading

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** “Fluxo operacional” e contagens de atenção mostravam `0` enquanto `loading`

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminDashboardPage` | Pendências: “Carregando contagens…”; Fluxo: placeholder até counts chegarem |

## Critérios

- [x] Durante load não aparece grade de grupos com total `0`
- [x] Após load, contagens reais (incluindo zero legítimo)
- [x] `tsc -b` OK

## Gate humano

Nenhum nesta fatia.
