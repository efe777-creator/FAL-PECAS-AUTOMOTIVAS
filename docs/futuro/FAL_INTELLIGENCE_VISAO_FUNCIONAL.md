# FAL Intelligence — Visão funcional (direção)

**Versão:** 1.0 · **Data:** 2026-11-16 · **Status:** FUTURO / direção (parcialmente presente)  
**Não autoriza Agent Commerce completo agora.**

---

## 1. Papel

Camada transversal que conecta dados, INV, IA, comunicação, pagamentos, integrações, eventos e governança — **sem inventar fatos**.

---

## 2. Componentes

| Componente | Hoje | Futuro |
|------------|------|--------|
| INV | Aliases, placa, resolução | Cobertura maior; engines/transmissões |
| Notificações | Inbox app + fanout | Omnichannel + WA |
| Pay routing | Híbrido MP/Asaas | Regras dinâmicas; split (após jurídico) |
| Search NL | Edge + local | Ranking/FTS |
| WhatsApp | Preferências/canal futuro | Assistente com dados reais + handoff humano |
| Eventos | order/payment/notif | Barramento interno maduro |
| Analytics | KPIs básicos | BI / demanda regional |
| Agentic | — | Ações assistidas com gates |

---

## 3. Princípio da IA

A IA **consulta** dados FAL e declara insuficiência.  
Proibido: inventar fitment, status de pedido, saldo, diagnóstico médico-automotivo sem evidência.

---

## 4. WhatsApp (direção)

Porta de entrada para o ecossistema:

- “Pastilhas para meu carro” → veículo + catálogo  
- “Onde está meu pedido?” → pedido real  
- “Revisão” → Garage + Parceiros  
- “Falar com alguém” → handoff com histórico  

Oficinas: agendamentos, orçamentos, aprovações (com Workshop/Parceiros).

---

## 5. Fundação MVP a preservar

- INV aditivo  
- Inbox `app_notifications`  
- Edges com contratos claros  
- `payment_routing_config`  
- Telemetria `vehicle_resolution_events` / payment_events  

---

## 6. Critérios para avançar

1. Dados SoT confiáveis (senão a IA amplifica erro)  
2. Commerce G8  
3. Política de privacidade/consentimento para canais  
4. Spec por caso de uso WA (não “bot genérico”)  

**Não construir antes:** agente autônomo com poder de cobrança/alteração sem gate; segundo CRM paralelo.
