# D-FRETE — decisão comercial (ficha)

**Data ficha:** 2026-10-10 · **Assinatura:** 2026-11-04  
**Estado:** **ASSINADO — Opção B**  
**Runtime:** `wtbpwuiayednvlhvuhbh`  

---

## Contexto técnico (FATO)

Provedores no código (`VITE_SHIPPING_PROVIDER` + opções `place_order`):

| Valor / opção | Comportamento |
|---------------|----------------|
| (default) `mock` | `mockShippingProvider` · `mock:*` no pedido |
| `own:*` | Frete próprio FAL (config admin; `enabled` controla) — pós-α |
| `correios` | sandbox Correios (client) |
| `frenet` | sandbox Frenet (client) |
| `carrier` | stub |
| Melhor Envio loja | **Ainda sem** carrier no registry; etiqueta sandbox = Expedição Pedidos |

Checkout (`CheckoutPage`) avisa que a cotação **não** é frete de produção sob política B.

**Estrutura técnica:** registry + envelope + UI PDP/carrinho/checkout sandbox + edge `quote-shipping` — [plano](./FAL_PLANO_FRETE_FINALIZACAO_2026-10-10.md) · [auditoria frete](./FAL_AUDITORIA_FRETE_COTACAO_ENTREGA_2026-10-10.md). Live HTTP loja **não** autorizada por esta ficha (B).

Evolução estrutural pós-α (hub Logística, origem, frete próprio, ME Expedição sandbox): [plano funcional](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md) · [auditoria consolidação ME](./FAL_AUDITORIA_LOGISTICA_ME_CONSOLIDACAO_2026-11-04.md) — **não** muda a política B desta assinatura.

---

## Opções (referência)

| ID | Política | Quando usar |
|----|----------|-------------|
| A | Retirada / combinado | Operação inicial sem cotação online “real” |
| B | Mock/sandbox explícito + aviso UI | Homologação / operação controlada α |
| C | Integração produção (Correios/ME live) | Após decisão + secrets + MARCHA HTTP |

---

## Decisão eFe (assinada)

```text
Opção escolhida: B
Data: 2026-11-04
Assinatura: eFe
Mensagem ao cliente na loja:
  Cotação de frete em homologação (sandbox/mock). Valores e prazos são
  estimativas para operação controlada — não constituem frete de produção
  contratado até nova decisão D-FRETE (C) ou módulo Logística live.
Expedição (quem/como):
  Operação controlada FAL: pedido entra em confirmação após pagamento
  aprovado; separação/envio sob processo interno do operador (não
  automatizado nesta fase α). Frete próprio SP / Melhor Envio = pós-α.
Próxima MARCHA técnica (se C): (N/A — opção B)
```

---

## Encerramento

**Aceite comercial frete α:** Opção **B** assinada.  
**Live (C) / Melhor Envio:** somente com nova assinatura + MARCHA + secrets.
