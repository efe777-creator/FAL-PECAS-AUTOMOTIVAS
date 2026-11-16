# FAL Workshop — Visão funcional (direção)

**Versão:** 1.0 · **Data:** 2026-11-16 · **Status:** FUTURO / direção  
**Não autoriza implementação agora.**

---

## 1. Público e proposta

**Público:** oficinas e mecânicos.  
**Problema:** gestão fragmentada; comprar peça e orçar em lugares diferentes.  
**Proposta:** ambiente profissional diário — agenda, clientes, orçamentos, OS, peças FAL, financeiro, mensagens.

---

## 2. Telas conceituais

Painel · Agenda · Clientes/veículos · Orçamentos · Ordens de serviço · Peças FAL · Financeiro · Mensagens · Relatórios · Configurações

---

## 3. Fluxo alvo

Receber solicitação → agenda → inspeção → orçamento com peças FAL → aprovação cliente → execução OS → conclusão → histórico Garagem (autorizado) → repasse

---

## 4. Entidades conceituais

Org · staff_member · appointment · inspection · quote · work_order · work_order_part · work_order_labor · approval_request

Ligar a `customers` / veículo canônico / `products` — sem cadastros paralelos.

---

## 5. Fundação MVP a preservar

- Catálogo e fitment  
- Checkout/pay idempotente  
- Identidade cliente/veículo  
- Permissões/roles extensíveis a org  

---

## 6. Critérios para iniciar

1. G8 Commerce  
2. Oficinas piloto dispostas a operar na ferramenta  
3. Spec OS + agenda  
4. Integração orçamento↔catálogo definida  
5. Sem depender de split definitivo (pode começar com compra de peças + OS interna)

**Não construir antes:** ERP completo de oficina; RH; estoque multi-filial complexo.
