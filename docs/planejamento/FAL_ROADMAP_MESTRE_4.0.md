# FAL — Roadmap Mestre 4.0

**Versão:** 1.1  
**Data:** 2026-11-16  
**Status:** CANÔNICO (execução por maturidade)  
**PRD:** [FAL_PRD_4.0.md](../entrada/FAL_PRD_4.0.md)  
**MVP:** [FAL_MVP_COMPLETO_4.0.md](./FAL_MVP_COMPLETO_4.0.md) · [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md)  
**Histórico:** [ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md) (supersedido como canônico)

Avanço por **maturidade e gates**, sem datas artificiais.

---

## Fases

### 1. Estabilização

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Alinhar código, SQL, Edges, front, flags |
| Escopo | P0 consolidação |
| Pré-condição | — |
| Saída | Tip/deploy coerentes; Asaas/MP operáveis |
| Gate | eFe migrate/deploy |

### 2. Prontidão de lançamento

| Campo | Conteúdo |
|-------|----------|
| Objetivo | G1–G4 evidenciados |
| Escopo | Produto, preço, pay, frete |
| Saída | Smokes críticos PASS |
| Gate | eFe |

### 3. Operacionalização

| Campo | Conteúdo |
|-------|----------|
| Objetivo | G5–G6 |
| Escopo | Separação, expedição, jurídico, pós-venda mínimo |
| Saída | Rotina ops + políticas |
| Gate | eFe (+ jurídico se preciso) |

### 4. Comercialização controlada

| Campo | Conteúdo |
|-------|----------|
| Objetivo | G7–G8 |
| Escopo | E2E, primeiras vendas, monitoramento |
| Saída | Venda real acompanhada |
| Gate | eFe |

### 5. Consolidação Commerce

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Qualidade de dados e UX pós-venda |
| Escopo | PVC massa, medidas, busca, promo, guest/boleto se aprovados |
| Saída | Commerce maduro |
| Gate | Métricas estáveis |

### 6. Crescimento

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Escala comercial |
| Escopo | SEO, campanhas, analytics, domínio |
| Saída | Aquisição sustentável |
| Gate | eFe |

### 7. FAL Garage

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Relacionamento com o veículo |
| Escopo | Ver [FAL_GARAGE_VISAO_FUNCIONAL.md](../futuro/FAL_GARAGE_VISAO_FUNCIONAL.md) |
| Pré-condição | Fase 4+; seed em uso |
| Gate | Spec + autorização |

### 8. Workshop piloto

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Ferramenta diária para oficinas piloto |
| Escopo | [FAL_WORKSHOP_VISAO_FUNCIONAL.md](../futuro/FAL_WORKSHOP_VISAO_FUNCIONAL.md) |
| Pré-condição | Commerce estável; oficinas parceiras |
| Gate | Piloto medido |

### 9. FAL Parceiros

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Marketplace serviços |
| Escopo | [FAL_PARCEIROS_VISAO_FUNCIONAL.md](../futuro/FAL_PARCEIROS_VISAO_FUNCIONAL.md) |
| Pré-condição | Jurídico/financeiro; Workshop ou equivalente |
| Gate | Parecer + piloto |

### 10. Fornecedores / B2B / Intelligence

| Campo | Conteúdo |
|-------|----------|
| Objetivo | Rede e camada inteligente |
| Escopo | [FAL_FORNECEDORES_VISAO_FUNCIONAL.md](../futuro/FAL_FORNECEDORES_VISAO_FUNCIONAL.md) · [FAL_INTELLIGENCE_VISAO_FUNCIONAL.md](../futuro/FAL_INTELLIGENCE_VISAO_FUNCIONAL.md) |
| Pré-condição | Volume e dados confiáveis |
| Gate | Spec por caso de uso |

---

## Regra de mudança

1. Problema + evidência  
2. Domínio + SoT  
3. Contrato impactado  
4. Efeito nas jornadas  
5. Classe: MVP / fase N / futuro / descartar  
6. Teste + rollback  
7. Atualizar documento proprietário  

---

## Foco atual

**Fase 4 = G8 agora** (comercialização controlada — [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §11).  
P0–G7 = **PASS** (2026-11-16). Pendente: 8.3 N vendas + 8.4 monitor ([VAL G8](./FAL_MARCHA_G8_VENDA_CONTROLADA_VAL_2026-11-16.md)).  
Ambientes 7–10 = direção documentada, **não** fila de sprint até G8 PASS.

### Anti-deriva

Qualquer MARCHA fora de P0–G8 exige classe explícita (MVP-bloqueador / Evolução / Futuro / Descartar). Sem classe → não entra.
