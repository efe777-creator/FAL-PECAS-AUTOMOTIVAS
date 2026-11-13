# VAL — Frete no carrinho (conjunto) + pré-seleção no checkout

**Data:** 2026-11-13  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Spec:** [FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md](./FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md)  

---

## Objetivo

Garantir que a cotação usa **todos os itens do carrinho** (ou buy-now) e que a modalidade escolhida na vitrine/carrinho chega **pré-selecionada** no checkout após re-cotação.

---

## Correções desta marcha

| # | Item | Antes | Depois |
|---|------|-------|--------|
| 1 | Fingerprint checkout | Só `itemCount` + subtotal | `cartItemsQuoteFingerprint` (productId:qty + subtotal) |
| 2 | Motor cotação checkout | `quoteShippingEnvelope` | **`quoteStorefrontShippingEnvelope`** (igual carrinho) |
| 3 | Pré-seleção checkout | Preferia `prev` local antes do handoff | **Handoff primeiro** (`matchPreferredShippingOption`) |
| 4 | Carrinho pós-cotação | Keep id / 1ª opção | `preferStorefrontShippingOption` + handoff |
| 5 | CEP 8 dígitos no carrinho | Só botão / mudança de itens | Auto-cotação ao completar CEP |
| 6 | Peso no checkout | Não enviado | `totalWeightKg` do conjunto |

---

## Fluxo canônico

```
Carrinho (itens) → loadCartLogistics → quoteStorefront → handoff sessionStorage
    → Checkout etapa Entrega → mesma quoteStorefront (endereço completo)
    → matchPreferredShippingOption(handoff) → opção pré-selecionada
```

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Fingerprint unit | **PASS** vitest |
| 2 | Smoke packing/POL/handoff existentes | **PASS** |
| 3 | Config wtbp (caixas/ME/own/CEP) | **PASS** (auditoria 13/11) |

```
npx vitest run src/services/shipping/cartQuoteFingerprint.test.ts src/services/shipping/shippingQuoteSession.test.ts src/services/shipping/preferStorefrontShippingOption.test.ts
```

---

## Smoke operador

1. Carrinho com 2+ SKUs → CEP Guarulhos → opções ME/FAL/retirada  
2. Escolher Jadlog ou Entrega FAL → Finalizar  
3. Checkout → Endereço (mesmo CEP) → Entrega: **mesma modalidade pré-marcada**  
4. Trocar um item do carrinho e voltar: checkout re-cota (fingerprint muda)

---

## STOP

Não altera packing v1 nem fórmula FAL. Handoff não é fonte de preço — só preferência; valor vem da re-cotação server-side.
