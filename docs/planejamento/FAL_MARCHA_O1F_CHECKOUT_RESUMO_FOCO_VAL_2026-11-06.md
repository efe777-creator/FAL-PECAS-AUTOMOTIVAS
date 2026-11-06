# VAL — O1-F residual: resumo, foco no erro, Salvar e continuar

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** aside sem itens; erro sem scroll/foco; “Salvar e continuar” ficava no passo Endereço

## Entrega

| Peça | Mudança |
|------|---------|
| `CheckoutPage` aside | Lista `qty×nome` + valores + totais |
| `CheckoutPage` erro | `role="alert"` + scroll/foco ao `setError` |
| `CheckoutPage` endereço | Após salvar → step Entrega (cotação no effect) |
| `AddressForm` | Mesmo padrão de foco no erro de validação |

## Critérios

- [x] Aside mostra linhas do carrinho
- [x] Erro do checkout rola/foca o alerta
- [x] Salvar 1º endereço avança para Entrega
- [x] `tsc -b` OK

## Gate humano

Nenhum nesta fatia.
