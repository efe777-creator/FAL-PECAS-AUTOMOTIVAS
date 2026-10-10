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

---

## Opções para decisão (escolher uma)

| ID | Política | Quando usar |
|----|----------|-------------|
| A | **Retirada / combinado** — sem cotação online como “frete real” | Operação inicial controlada |
| B | **Mock/sandbox explícito** — manter cotação com aviso na UI (estado atual endurecido) | Homologação |
| C | **Integração produção** (Correios/Frenet live) — credenciais + VAL frete | Após decisão + secrets |

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
