# VAL — O1-F: Identificação checkout em modo leitura

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** CPF/CNPJ já validado no perfil ainda aparecia editável na Identificação

## Entrega

| Peça | Mudança |
|------|---------|
| `CheckoutPage` | Com documento válido no perfil: painel **somente leitura** + link para `/conta/perfil`; sem radios/input |
| Avanço automático | Mantido (pula para Endereço na entrada) |

Sem documento no perfil: formulário CPF/CNPJ permanece editável.

## Critérios

- [x] Perfil com CPF/CNPJ válido → não re-pede edição na Identificação
- [x] Voltar para o passo 0 mostra o documento em leitura
- [x] Sem documento → inputs liberados
- [x] `tsc -b` OK

## Gate humano

Nenhum nesta fatia.
