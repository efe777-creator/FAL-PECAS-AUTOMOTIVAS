# AJUSTE-035 — Matriz de homologação CHECKOUT-05 (atualizada)

**Data:** 2026-11-12 · **atualizada** pós cruzamento  
**Plano:** [FAL_PLANO_AJUSTE_035_CHECKOUT.md](./FAL_PLANO_AJUSTE_035_CHECKOUT.md)  
**Cruzamento:** [FAL_AUDITORIA_AJUSTE_035_CHECKOUT_CRUZAMENTO_2026-11-12.md](./FAL_AUDITORIA_AJUSTE_035_CHECKOUT_CRUZAMENTO_2026-11-12.md)

## Provas obrigatórias

| Prova | Critério | Status |
|-------|----------|--------|
| Financeira | valor/status/id cobrança = MP | **PASS herdado** (Pix R$1 11/11 + Central aprovado) |
| Operacional | Central estado correto sem intervenção | **PASS** (pendente + aprovado 12/11) |
| Recuperação | refresh / rede / retorno tardio | **PASS** approved→confirmação · mid-pay pending cartão + Pix expirado → UI pagamento |

## Matriz de cenários

| Cenário | Resultado obrigatório | Status |
|---------|----------------------|--------|
| Pix pago | Pedido confirmado | **PASS herdado** |
| Pix não pago | Continua aguardando | Código + Central pendente |
| Pix expirado | Nova tentativa segura | Código retry |
| Cartão aprovado | Confirmado | Código Brick + sync |
| Cartão recusado | Recusa + não marca pago | Código Brick |
| Cartão pendente longo | Mensagem + retry | Código timeout |
| Erro comunicação | Sem pedido duplicado | idempotency_key |
| Atualizar checkout | Estado recuperado | **PASS** approved + mid-pay · [VAL recovery](./FAL_MARCHA_AJUSTE_035_CHECKOUT_RECOVERY_UI_VAL_2026-11-12.md) · [VAL mid-pay](./FAL_MARCHA_AJUSTE_035_CHECKOUT_MIDPAY_WEBHOOK_VAL_2026-11-12.md) |
| Duplo clique | Uma operação | submitLockRef |
| Comprar agora | Só produto; carrinho intacto | **PASS smoke** |
| Alterar frete/CEP | Recota | Código loadQuotes |
| Boleto | Não oferecido | **PASS** |
| Cartão salvo | Não nesta onda | Documentado |
| Mobile | Compra navegável | Pills **2 momentos** · smoke desktop · Netlify residual |

## Testes automatizados

- `resolveCheckoutPaymentOutcome.test.ts` — C1 · **PASS**
- `resumeCheckoutOutcome.test.ts` — C2 matriz recovery · **PASS**
- `checkoutSession.test.ts` — C2 · **PASS**
- `buyNowSession.test.ts` — C5 · **PASS**
- `checkoutEmptyGuard.test.ts` — **PASS**  
**Total:** 16/16 (`src/services/checkout` + Checkout)

## Dependência humana

**CP-PAY-021:** URL Edge no sandbox MCP OK · **secret** Gate · app live fora MCP.  
Poll/sync mitiga; não substitui webhook live homologado.

## Cartão salvo

Não implementado (sem vault FAL). Correto fora de escopo.
