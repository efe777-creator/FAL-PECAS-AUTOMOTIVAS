# VAL — PDP/carrinho cotação frete real (ME + próprio)

**Data:** 2026-11-05  
**Auth:** eFe — falha ao consultar CEP na PDP  
**Runtime:** wtbp · Netlify loja

---

## Causa raiz (FATO)

| Achado | Evidência |
|--------|-----------|
| Vitrine usava `VITE_SHIPPING_PROVIDER` default **mock** | PDP CEP 14020-060 → só mock econômica/expressa + disclaimer D-FRETE |
| Frete próprio só capital SP `01000000–05999999` | CEP interior não entra em own |
| Own `distance_vehicle` exige **número** | Sem Nº → `own:needs_number` (não era preço) |
| Published já têm peso/dims/POL | 100/100 quote-ready ME; pol_null=0 |

## Correção

| Item | Entrega |
|------|---------|
| `quoteStorefrontShippingEnvelope` | Cotação forçada `melhorenvio` + own; **remove mock de tabela** da vitrine |
| PDP / carrinho | Campo **Nº**; sem medidas ME → bloco **não renderiza** |
| Product storefront select | Inclui `pol_unit` / `own_delivery_allowed` |

## Smoke

1. PDP produto com medidas → CEP → opções ME (e FAL se cobrir + Nº).  
2. Sem medidas → bloco frete ausente.  
3. CEP capital + Nº → ownq priced quando coberto.

**Assinatura agente:** VAL PDP frete ME real 2026-11-05.
