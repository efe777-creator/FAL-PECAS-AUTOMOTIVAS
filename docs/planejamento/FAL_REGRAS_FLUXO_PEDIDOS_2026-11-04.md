# FAL — Regras do fluxo de pedidos

**Data:** 2026-11-04  
**Fonte:** decisão eFe (consolidada)  
**Status:** canônico de negócio · implementação em ondas  
**Cruzamento:** [auditoria completa](./FAL_AUDITORIA_COMPLETA_PENDENCIAS_2026-11-04.md) · [backlog pós-α](./FAL_BACKLOG_POS_ALPHA_2026-11-04.md)

---

## Mapa linguagem comercial × status interno

| Linguagem comercial | Status interno (FATO) |
|---------------------|------------------------|
| Pendente de pagamento | `aguardando_pagamento` |
| Aguardando confirmação da loja | `recebido` / `em_analise` / `aguardando_disponibilidade` |
| Aguardando autorização do cliente | `aguardando_decisao` |
| Aprovado / separação | `confirmado` → `em_separacao` |
| Aguardando postagem | `pronto_para_envio` |
| Enviado / Entregue | `enviado` / `entregue` |
| Cancelado | `cancelado` |

---

## 1. Fluxo principal

1. **Pedido realizado — Pendente de pagamento**
   - O cliente pode editar ou cancelar o pedido.
   - O operador visualiza o pedido e acompanha o pagamento.
   - Acesso rápido à etapa de pagamento (sem navegar por várias telas).
2. **Pagamento aprovado — Aguardando confirmação da loja**
   - O cliente não edita mais o pedido diretamente.
   - O operador confere produtos, quantidades e disponibilidade.
   - A loja pode marcar itens indisponíveis ou com prazo diferente.
3. **Aguardando autorização do cliente**
   - Se houver indisponibilidade ou prazo diferente, a loja solicita autorização.
   - O pedido aguarda a resposta antes de ser confirmado.
   - Alteração **não** pode ser aplicada em silêncio.
4. **Pedido aprovado pela loja — Enviado para separação**
   - Confirmação geral da loja após conferência de todos os itens.
   - Cliente informado de que a loja aprovou e iniciou a separação.
5. **Em separação** — equipe prepara; operador acompanha.
6. **Aguardando postagem** — separado, aguardando envio.
7. **Enviado** — postagem/entrega à transportadora; rastreio depois.
8. **Entregue** — pedido finalizado.

---

## 2. Regras de edição e cancelamento

| Situação | Regra |
|----------|-------|
| Antes do pagamento | Cliente pode editar e cancelar |
| Após pagamento | Não pode editar diretamente |
| Após pagamento | Pode solicitar cancelamento, sujeito à análise da loja |
| Após início da separação | Cancelamento depende de análise operacional |

**Importante:** cancelamento preserva o histórico. Não apagar registros.

**Edição pré-pagamento (implementação Onda 1):** cancelar o pedido não pago e devolver itens ao carrinho (pedido permanece `cancelado` no histórico) — sem editar itens in-place no pedido.

---

## 3. Indisponibilidade de produtos

1. Operador registra o problema no item.  
2. Cliente recebe solicitação de autorização.  
3. Pedido aguarda resposta (`aguardando_decisao`).  
4. Com autorização → loja pode confirmar.  
5. Sem autorização → permanece aguardando resolução.

Confirmação da loja = **uma confirmação geral** após conferência de todos os itens.

---

## 4. Pagamento — acesso rápido pelo pedido

- **PIX:** recuperar código/QR gerado, se ainda válido.  
- **Cartão:** consultar estado; continuar/confirmar conforme retorno do provedor.  
- **Aprovado:** atualizar pedido só com confirmação confiável do gateway.  
- **Pendente/recusado:** manter `aguardando_pagamento` com a situação correspondente.

> Não considerar cobrança aprovada porque o operador clicou em confirmar. Aprovação = gateway (webhook / `confirm_mercadopago_payment`).

---

## 5. Perfil do cliente — salvar cartão (Onda 3)

Pergunta voluntária no perfil: *Deseja salvar seu cartão para futuras compras?*  
Cliente gerencia/remove cartões; nas compras seguintes seleciona o cadastrado.

**Regra de segurança (obrigatória):** a FAL **não** armazena número completo do cartão nem CVV. Armazenamento via tokenização no provedor (Mercado Pago). A FAL guarda somente token + bandeira + últimos quatro dígitos.

---

## 6. Resumo das decisões

| Decisão | Regra |
|---------|-------|
| Produto indisponível | Solicitar autorização do cliente |
| Edição após pagamento | Não permitir edição direta |
| Cancelamento após pagamento | Solicitação sujeita à análise |
| Confirmação da loja | Uma confirmação geral após conferência |
| Pagamento pendente | Acesso direto para continuar |
| PIX / Cartão | Recuperar QR / consultar e continuar |
| Cartão salvo | Voluntário + tokenização no provedor |

---

## 7. Ondas de implementação

| Onda | Escopo | Estado |
|------|--------|--------|
| **1** | Cancelar não pago (cliente) · decisão em `aguardando_decisao` · labels/CTAs comerciais | **Próxima MARCHA (M4)** |
| **2** | Solicitação de cancelamento pós-pagamento + análise + estorno MP | Planejado (M8) |
| **3** | Cartão salvo tokenizado (MP Customers/Cards) | Planejado (M10) — decisão seguir/adiar |

Já operacional (fora das ondas): retomar pagamento, confirmação/separação admin, expiry 48 h (RPC; cron = M5 `pg_cron`).
