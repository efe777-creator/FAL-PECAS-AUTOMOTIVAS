# FAL Garage — Visão funcional (direção)

**Versão:** 1.0 · **Data:** 2026-11-16 · **Status:** FUTURO / direção  
**Não autoriza implementação agora.**  
**Visão:** [FAL_VISAO_ECOSSISTEMA_2040.md](../entrada/FAL_VISAO_ECOSSISTEMA_2040.md)  
**Seed MVP:** `customer_vehicles` · `/conta/veiculos`  
**Spec detalhada (Planejamento 1):** [FAL_PLANO1_MINHA_GARAGEM_FUNDACAO_EXPERIENCIA_2026-11-18.md](../planejamento/FAL_PLANO1_MINHA_GARAGEM_FUNDACAO_EXPERIENCIA_2026-11-18.md) — fundação + experiência inicial (aguardar aprovação eFe antes de codar).  
**Fundação placa:** [FAL_PLANO0_FUNDACAO_CADASTRO_PLACA_2026-11-17.md](../planejamento/FAL_PLANO0_FUNDACAO_CADASTRO_PLACA_2026-11-17.md)

---

## 1. Público e proposta

**Público:** proprietário do veículo.  
**Problema:** histórico e cuidados dispersos.  
**Proposta:** painel do carro — organização, lembretes confiáveis, despesas, documentos, continuidade com Commerce/Parceiros.

---

## 2. Maturidade

| Nível | Conteúdo |
|-------|---------|
| Seed (MVP) | Salvar/trocar veículo; usar no funil |
| Garage 1 | Perfil do veículo, km, histórico de compras FAL, lembretes básicos |
| Garage 2 | Despesas, documentos, compartilhamento autorizado |
| Garage 3 | Planos manutenção com confiança de dados; integração OS oficina |

---

## 3. Telas conceituais

Visão geral · Histórico · Manutenção · Despesas · Peças compatíveis · Documentos

Navegação mobile futura: Início | Garagem | Peças | Serviços | Conta

---

## 4. Entidades conceituais

Vehicle profile · mileage_log · history_entry (com proveniência) · maintenance_item · expense_entry · garage_document · share_grant

Sempre ligadas à identidade canônica de veículo/cliente — não clonar cadastros.

---

## 5. Regras

- Não afirmar troca de peça só por km genérico.  
- Proveniência: cliente ≠ oficina confirmada.  
- Compartilhamento só com autorização explícita.

---

## 6. Fundação que o MVP deve preservar

- `customer_vehicles` + `version_id`  
- INV aditivo  
- PVC  
- Pedidos linkáveis ao veículo (quando houver contexto)

---

## 7. Critérios para iniciar implementação

1. G8 Commerce estável  
2. Seed Garage em uso real  
3. Modelo de proveniência aprovado  
4. Spec detalhada + autorização eFe  

**Não construir antes:** manutenção preditiva “mágica”, social garage, Club.
