# VAL — O1-A máscaras origem de frete

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial plano  
**Item:** Máscaras duplicadas em `AdminShippingOriginPage`

## Entrega

| Peça | Papel |
|------|--------|
| `formatPhoneMask` (`lib/phone`) | Substitui helper local |
| `formatCpfOrCnpjMask` (`lib/document`) | Máscara dinâmica CPF/CNPJ para o campo documento da origem |
| Página origem | Sem funções locais de máscara |

## Critérios

- [x] Sem `function formatPhoneMask` / `formatDocumentMask` na página
- [x] Vitest `document.test.ts` OK
- [x] Inventário atualizado

## Gate humano

Nenhum.
