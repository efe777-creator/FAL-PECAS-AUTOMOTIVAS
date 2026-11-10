# VAL — Frete disponível + Retirada na loja (PDP → Checkout)

**Data:** 2026-11-10  
**Auth:** eFe — plano Frete e retirada  
**Escopo:** helper pickup estável + handoff PDP/carrinho → checkout + UI compacta + painel endereço loja

---

## Entregas

| Item | Resultado |
|------|-----------|
| `storePickupOption` + inject ME/storefront | PASS |
| Handoff estável (`kind` / `serviceCode` / label) | PASS |
| PDP compacta com radios + pickup R$ 0 | PASS |
| Carrinho: pickup + handoff rico | PASS |
| Checkout: match preferência + `StorePickupNotice` | PASS |
| Vitest pickup + session match | PASS (suite local) |

## Comportamento

1. Cliente vê fretes disponíveis **ou** Retirada na loja R$ 0,00.  
2. Seleção na PDP/carrinho grava `fal.shippingQuoteHandoff.v1`.  
3. Checkout pré-seleciona (id → pickup → serviceCode → label).  
4. Retirada mostra endereço de `store_shipping_origin` + aviso de prontidão.

## PDP sem número + Comprar agora → checkout (2026-11-10)

| Item | Resultado |
|------|-----------|
| Consulta PDP só com CEP (sem nº) | PASS |
| Número/complemento no checkout | PASS (copy + fluxo) |
| Seleção grava handoff | PASS |
| “Comprar agora” → `/checkout` com modalidade | PASS |
| Endereços salvos do perfil na PDP/carrinho | PASS |
| Checkout pré-seleciona `preferredAddressId` | PASS |

## Revisão coerência (2026-11-10)

| Achado | Correção |
|--------|----------|
| Ordem PDP/carrinho ≠ checkout | `ensureCustomerShippingOptions` único (preço ↑, retirada por último) |
| Pós-cotação preferia “não-pickup” | Mantém seleção atual; senão 1ª da lista ordenada |
| `withStorePickupOption` repetido na UI | UI confia no envelope storefront; inject só ME + ensure |
| Ternário CEP duplicado no handoff | Simplificado |
| `etaDaysMin===0` rotulava “Retirada” em frete próprio | Só pickup |

## Fora desta fatia

Toggle admin de retirada · webhook · etiqueta ME · G8.

**Assinatura:** VAL frete+retirada PDP→checkout PASS + coerência ordenação · 2026-11-10.
