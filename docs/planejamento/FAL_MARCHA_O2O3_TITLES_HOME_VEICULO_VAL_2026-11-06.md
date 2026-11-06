# VAL — Onda 2/3 residual: titles loja + veículo no topo

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Itens:** document.title funil/conta · Home “Buscar pelo carro” após hero

## Entrega

| Peça | Mudança |
|------|---------|
| Home | Bloco `#veiculo` logo após o hero (antes de banners/destaques) |
| Funil | `useDocumentTitle` em Carrinho, Checkout, Confirmação, Login, Cadastro, senha, 404 |
| Conta | Títulos em home, pedidos, detalhe, perfil, endereços, veículos, favoritos |

## Critérios

- [x] `tsc --noEmit` OK
- [x] CTA “Buscar pelo carro” ainda aponta para `#veiculo` no topo

## Gate humano

Condições de pagamento (11/12) e Gemini permanecem standby / decisão eFe.
