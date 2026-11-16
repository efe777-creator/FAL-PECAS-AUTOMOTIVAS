# FAL Parceiros — Visão funcional (direção)

**Versão:** 1.0 · **Data:** 2026-11-16 · **Status:** FUTURO / direção  
**Não autoriza implementação agora.**  
**Visão:** [FAL_VISAO_ECOSSISTEMA_2040.md](../entrada/FAL_VISAO_ECOSSISTEMA_2040.md)

---

## 1. Público e proposta

**Público:** proprietário buscando serviço; oficinas parceiras.  
**Problema:** achar, orçar e contratar serviço fora da FAL.  
**Proposta:** marketplace de oficinas com propostas estruturadas e, no futuro, checkout único peças + mão de obra.

---

## 2. Jornadas conceituais

1. Descobrir oficinas (local, especialidade, avaliação)  
2. Solicitar orçamento (veículo + relato + mídia)  
3. Comparar propostas  
4. Contratar e pagar (futuro — sujeito a jurídico)  
5. Acompanhar execução  
6. Avaliar e atualizar Garagem  

---

## 3. Telas conceituais (cliente)

Serviços · Lista/mapa oficinas · Detalhe parceiro · Solicitação · Comparativo propostas · Acompanhamento serviço

---

## 4. Entidades conceituais

Organization (oficina) · service_listing · service_request · proposal · proposal_line (peças/mão de obra) · engagement · payout_obligation (futuro)

---

## 5. Riscos críticos

| Risco | Nota |
|-------|------|
| Jurídico / tributário | Pagamento único e repasse |
| Financeiro | Split, estorno, disputa |
| Qualidade | Oficinas validadas; não só preço |
| Dados | Acesso limitado à Garagem |

**Regra:** não escolher schema de split nem implementar cobrança integrada sem validação jurídica/econômica.

---

## 6. Fundação MVP a preservar

- Cliente e veículo canônicos  
- Catálogo/preço/pedido FAL  
- Pay ledger idempotente  
- Eventos de pedido reutilizáveis  

---

## 7. Critérios para iniciar

1. Commerce G8 estável  
2. Piloto Workshop (ou em paralelo controlado)  
3. Parecer jurídico/financeiro  
4. Grupo piloto de oficinas e categorias limitadas  
5. Spec + gates de disputa/estorno  

**Não construir antes:** app só de mecânicos desconectado; indicação sem contrato; split improvisado.
