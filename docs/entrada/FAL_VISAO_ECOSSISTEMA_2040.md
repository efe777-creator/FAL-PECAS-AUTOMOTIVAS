# FAL — Visão do Ecossistema 2040

**Versão:** 1.0  
**Data:** 2026-11-16  
**Status:** CANÔNICO (norte estratégico)  
**Autoridade:** este documento define direção; **não autoriza implementação**.  
**Produto canônico:** [FAL_PRD_4.0.md](./FAL_PRD_4.0.md)  
**Roadmap:** [FAL_ROADMAP_MESTRE_4.0.md](../planejamento/FAL_ROADMAP_MESTRE_4.0.md)

---

## 1. Tese

A FAL deve ser o lugar onde o proprietário resolve praticamente tudo relacionado ao seu veículo.

Hoje a jornada está fragmentada: pesquisar peça, comparar preço, achar oficina, orçar, comprar, agendar, acompanhar. A FAL reúne essa jornada em uma plataforma automotiva com ambientes conectados — não um e-commerce isolado com “mais botões”.

A primeira compra de peça é a **porta de entrada**, não o único relacionamento.

---

## 2. Três experiências

1. **Proprietário** — comprar, cuidar, organizar e acompanhar veículos.  
2. **Profissional** — oficinas e mecânicos operam, recebem clientes, compram peças e executam serviços.  
3. **Empresarial** — a FAL administra comércio, parceiros, fornecedores, pagamentos, dados e infraestrutura.

Uma camada de **Intelligence** conecta tudo.

---

## 3. Ambientes do ecossistema

| Ambiente | Função |
|----------|--------|
| **FAL Commerce** | Peças, catálogo, busca, fitment, estoque, preço, pagamento, frete, pedidos, atendimento |
| **FAL Garage** | Veículos, histórico, manutenção, despesas, documentos, quilometragem, lembretes |
| **FAL Parceiros** | Oficinas/mecânicos, orçamentos, contratação, checkout peças+mão de obra, repasses |
| **FAL Workshop** | Ferramentas profissionais: agenda, clientes, OS, peças, financeiro |
| **FAL Fornecedores** | Portal/rede de abastecimento, catálogo, estoque, pedidos B2B |
| **FAL Intelligence** | INV, IA, WhatsApp, APIs, dados, automações, governança, Agentic Commerce futuro |

Os ambientes **não** são empresas ou sistemas separados. Compartilham identidade e dados; cada perfil vê o necessário conforme permissões.

---

## 4. Ciclo de relacionamento

```text
Cliente cadastra veículo
        ↓
FAL conhece o veículo e contexto
        ↓
Compra peça e/ou contrata serviço
        ↓
Oficina executa e registra (quando aplicável)
        ↓
Garagem recebe histórico com proveniência
        ↓
FAL identifica novas necessidades legítimas
        ↓
O ciclo recomeça com mais contexto
```

Valor para todos:

- Cliente: conveniência, organização, confiança.  
- Oficina: demanda, ferramentas, acesso a peças.  
- Fornecedor: canal integrado.  
- FAL: vendas, recorrência, dados, novas receitas.

---

## 5. Princípios éticos e de produto

1. **Não inventar** compatibilidade, diagnóstico, manutenção ou saldo financeiro.  
2. Identificar veículo ≠ conhecer todas as características técnicas ≠ fitment de peça.  
3. Histórico com **proveniência e confiabilidade** (dono ≠ oficina confirmada).  
4. Uma verdade por domínio; reutilizar antes de criar.  
5. Modularidade sem microsserviços prematuros.  
6. Evolução por maturidade e gates — não por calendário vazio.  
7. Arquitetura de hoje deve caber a visão de amanhã **sem derrubar paredes**.

---

## 6. Fases de maturidade (sem datas artificiais)

| Fase | Nome | Objetivo |
|------|------|----------|
| 1 | Commerce sólido + semente Garage | Vender, operar, controlar — G8 |
| 2 | Garage inicial | Relacionamento de longo prazo com o veículo |
| 3 | Workshop + Parceiros piloto | Validar economia e operação de serviços |
| 4 | Expansão (fornecedores, B2B, app, CRM) | Escala da rede |
| 5 | Plataforma inteligente | Predição confiável, agentic, infraestrutura setorial |

Avanço depende de critérios de maturidade, não apenas de vontade de feature.

---

## 7. O que a primeira versão precisa (e o que não)

**Precisa:** decisões de produto, dados e contratos alinhados a esta visão.  
**Não precisa:** implementar todos os ambientes de uma vez.

A Fase 1 (MVP) está definida em [FAL_MVP_COMPLETO_4.0.md](../planejamento/FAL_MVP_COMPLETO_4.0.md).

---

## 8. Diferencial

Telas isoladas são copiáveis. O diferencial é a **combinação integrada** com dados compartilhados e experiências distintas por perfil — a mesma plataforma, não quatro produtos desconectados.

---

## 9. Limite de autoridade

Este documento orienta planejamento e PRD. Qualquer MARCHA de implementação exige:

1. classificação na fase ativa;  
2. evidência na auditoria consolidada ou nova auditoria;  
3. atualização do documento proprietário da regra;  
4. gate humano quando dinheiro, jurídico ou produção estiverem envolvidos.
