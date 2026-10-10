# D-FRETE — decisão comercial (ficha)

**Data:** 2026-10-10  
**Estado:** **PENDENTE DE ASSINATURA eFe**  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Contexto técnico (FATO)

Provedores no código (`VITE_SHIPPING_PROVIDER`):

| Valor | Comportamento |
|-------|----------------|
| (default) | `mockShippingProvider` |
| `correios` | sandbox Correios |
| `frenet` | sandbox Frenet |
| `carrier` | stub |

Checkout (`CheckoutPage`) avisa que a cotação **não** é frete de produção até D-FRETE.

**Recomendação α (não assina):** **A** ou **B** para primeira operação controlada. **C** só com MARCHA + secrets.

**Experiência alvo (planejada):** seção **Entrega e frete** na PDP (CEP → opções reais). Isso **não** cabe em A/B como cotação real — A/B exigem mensagem honesta de indisponibilidade/homologação. Direção desejada para PDP com preço/prazo sustentados: **C** (pendente assinatura).

**Estrutura técnica 10/10:** registry + envelope + edge `quote-shipping` + MCP Correios — ver [auditoria](./FAL_AUDITORIA_FRETE_COTACAO_ENTREGA_2026-10-10.md). Live HTTP ainda **não** autorizada por esta ficha.

---

## Opções para decisão (escolher uma)

| ID | Política | Quando usar |
|----|----------|-------------|
| A | **Retirada / combinado** — sem cotação online como “frete real” | Operação inicial controlada |
| B | **Mock/sandbox explícito** — manter cotação com aviso na UI (estado atual endurecido) | Homologação |
| C | **Integração produção** (Correios live 1º; Frenet/carriers depois) — credenciais + VAL frete + PDP | Após decisão + secrets + MARCHA HTTP |

---

## Decisão eFe (preencher)

```text
Opção escolhida: A / B / C
Data:
Assinatura:
Mensagem ao cliente na loja:
Expedição (quem/como):
Próxima MARCHA técnica (se C):
```

---

## Encerramento deste todo (plano)

**Entrega do agente:** ficha + aviso honesto no checkout (código).  
**Aceite comercial:** só com opção assinada acima.
