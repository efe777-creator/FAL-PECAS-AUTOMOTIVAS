# Controle de pagamentos — vitrine + condições (design)

## Donos únicos

| Conceito | Edita onde | Não faz |
|----------|------------|---------|
| Item em promoção | `/admin/home/promocoes` | % Pix, parcelas, meios |
| Preço Base / Promo | `/admin/precos` | Ligar promoção no SKU |
| Condições Pix/débito/crédito | Home → Pagamentos | Escolher lista do SKU |
| Roteamento / API | Admin → Pagamentos | % comercial |
| Reembolso / ledger | Central de Pedidos | Config de gateway |

## Encadeamento de preço

1. `resolve_product_price` → base (lista promo se ativo em Promoções; senão lista padrão).
2. `applyPaymentCondition(base, method, settings)` → valor exibido/cobrado.
3. Mesmas condições Home valem para base promo ou padrão.
4. % aplica só no subtotal de produtos; frete fora.
5. Selo Oferta (lista) ≠ linha de condição Pix.

## Card / PDP

- Principal: melhor à vista (Pix se ligado com ajuste; senão base ± crédito).
- Secundário: “ou em até Nx” sobre condição crédito.
