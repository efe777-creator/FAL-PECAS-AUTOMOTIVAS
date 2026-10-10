# MARCHA — E2E pré-pagamento (loja pública)

**Data:** 2026-10-10  
**Estado:** VALIDADO (até login; pagamento = gate humano)  
**URL:** https://fal-pecas-automotivas.netlify.app  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Escopo

Caminho crítico α **sem** secrets MP e **sem** conta cliente: catálogo → PDP → carrinho → gate checkout.

| Etapa | Resultado |
|-------|-----------|
| Catálogo público | OK — cards + CTAs |
| PDP | OK — `Axial de Direção` BRD9329 · R$ 51,57 · Disponível · apps |
| Add / qty no carrinho | OK — badge **1** · PDP “No carrinho” |
| Carrinho | OK — item + subtotal R$ 51,57 · frete “A calcular” |
| Checkout anônimo | OK — redireciona `/login` · CTA “Entrar para finalizar” |
| Bundle checkout | OK — `CheckoutPage` contém MercadoPago + aviso D-FRETE |
| Pix/cartão sandbox / place_order pago | **BLOQUEADO** — H1–H6 + login cliente |

---

## Evidências (produção)

- PDP: `/produto/8fb95725-a334-4152-89fc-60dd69eb087c`
- Carrinho: `Carrinho (1)` · Referência BRD9329 · Total R$ 51,57
- `/checkout` → `/login`
- Asset: `CheckoutPage-*.js` com `create-mp-payment` / `MercadoPago` / texto D-FRETE

---

## Próximo (humano)

1. Login cliente teste + endereço  
2. Smoke MP H1–H6 ([prep](./FAL_MP_SMOKE_PREP_2026-10-09.md))  
3. Assinar D-FRETE  
4. Pedido E2E completo  

---

## Fora de escopo

- Secrets `MP_*`  
- place_order pago  
- Staff admin  
