# Diagnóstico de consolidação — FAL Peças Automotivas 3.0

**Data:** 2026-10-08  
**Escopo:** análise cruzada PRD antigo + Roadmap + Plano/auditorias + rascunho PRD 08/10  
**Resultado:** base para PRD Mestre 2.0, Roadmap atualizado e Backlog de consolidação  
**Sem implementação de código nesta entrega.**

---

## Atualização operacional — Fase 0 (fonte mais recente)

A auditoria Fase 0 (evidências código + Supabase + Browser + git) **refina** este diagnóstico e passa a ser a **fonte operacional mais recente** para o estado observado:

| Artefato | Path |
|----------|------|
| Mapa | [AUDITORIA_FAL_FASE0_MAPA_2026-10-08.md](./AUDITORIA_FAL_FASE0_MAPA_2026-10-08.md) |
| Inventário | [AUDITORIA_FAL_FASE0_INVENTARIO_2026-10-08.md](./AUDITORIA_FAL_FASE0_INVENTARIO_2026-10-08.md) |
| Findings | [AUDITORIA_FAL_FASE0_FINDINGS_2026-10-08.md](./AUDITORIA_FAL_FASE0_FINDINGS_2026-10-08.md) |
| Causas-raiz | [AUDITORIA_FAL_FASE0_CAUSAS_RAIZ_2026-10-08.md](./AUDITORIA_FAL_FASE0_CAUSAS_RAIZ_2026-10-08.md) |
| Plano + gate | [AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md](./AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md) — **GATE Onda 0 aprovado** |

**Bloqueador #1 (corrigido 2026-10-08):** FIND-001 no MCP apontava ao projeto **HF** `owll…`. O runtime da app é **`wtbp…`**, já em linhagem `fase*` — [adendo](./FAL_IMP_01_ADDENDUM_RUNTIME_CANONICO_2026-10-08.md) + [VAL-01 PASS](./FAL_VAL_01_RUNTIME_SCHEMA_2026-10-08.md).  
**Hierarquia:** SCHEMA → DADOS → REGRAS ÚNICAS → CATÁLOGO/LOJA → INTEGRAÇÕES → F11+.  
**Próximo:** **gate eFe Onda 1** (dados/regras).

### Matriz de estado (pós-Fase 0)

| Área | Estado |
|------|--------|
| Visão estratégica | Bem definida (PRD Mestre 2.0) |
| Backoffice | Existe; precisa consolidação |
| Banco / schema | **P0** — linhagens divergentes |
| Dados de produto | Incompletos (52 published / 1 available; pouco custo/preço/app) |
| Pricing | Divergente (várias resoluções) |
| Catálogo | Estrutura existe; operação inconsistente |
| Publicação / Liberar | Precisa governança (checklist) |
| Aplicações | Dados insuficientes |
| Importação | Funcional; histórico UI incompleto |
| Pedidos / estoque | Não aprofundar antes do schema |
| Frete | Decisão pendente |
| Mercado Pago | Smoke humano pendente |
| PIM / matching IA / multi-canal | Futuro (F11+) |

---

## PARTE 1 — Diagnóstico da consolidação

### O que cada documento representa

| Documento | Papel | Limite |
|-----------|--------|--------|
| `docs/entrada/FAL_PRD_3.0.md` (antigo) | Visão de produto e requisitos iniciais | Stack Nest/Prisma e status “pré-desenvolvimento” obsoletos; mistura futuro e presente |
| `docs/planejamento/ROADMAP_FASES_3.0.md` (até 04/10) | Ordem de fases e gates | Desatualizado em F8.1/F9 (ainda fala “futura” / “pendentes”) |
| Plano mestre backlog + relatórios/STOPs (07–08/10) | Estado observado, STOPs, próximos blocos | Snapshots pontuais; baseline 07/10 parcialmente superado |
| Rascunho PRD 08/10 | Tentativa de PRD mestre | Bom conteúdo; mistura camadas (visão + regras + roadmap + futuro) |

### Consistente entre fontes

- Plataforma **própria** FAL; HF como fonte, não autoridade universal.
- Stack real: Vite + React + TS + Tailwind + Supabase (`ARCHITECTURE.md`, roadmap).
- Uma verdade por domínio: custo em `supplier_products.cost`; preços em listas + `price_origin`; estoque com modos + snapshot no pedido.
- Import com prévia/aprovação; **sem auto-publicar**.
- F1–F7 / 7A–7F concluídas; F8 Fatia A entregue; F8.1 base comercial construída.

### Desatualizado

- PRD antigo §10 (Next/Nest/Prisma/SQLite/monorepo apps/*).
- Roadmap/README: “F8.1 futura”, “F8–10 pendentes” sem nuance.
- Baseline 07/10 em pontos já evoluídos (WhatsApp, PVC year range, operadores C/D).
- “Código FAL” na UI (rótulo operacional atual: **Código referência**).

### Duplicado

- `docs/FAL_PRD_3.0.md` vs `docs/entrada/FAL_PRD_3.0.md`.
- Regras de preço/import/estoque espalhadas em PRD + specs F8.1 + planos.
- Roadmaps paralelos (PRD §65–66 vs ROADMAP_FASES vs fases do rascunho 08/10).

---

## A–G (síntese)

### A. Confirmado
Stack Supabase; independência HF; SKU técnico único; PVC estruturada; import por domínio; estoque 3 modos + `inventory_mode_at_order`; preços com markup/margem/fixo e `price_origin`; D16 (só `calculated` recalcula com custo).

### B. Concluído (evidência documental)
F1–F7; F6B/F6C; F8 Fatia A; F8.1–F8.4 base (import catálogo/conversão/custo/preço, UX listas); F9-E hardening local (13 testes + build); blocos A–E backlog (parcial); Liberar na loja + precificação operacional (marchas 07/10).

### C. Pendente / parcial
Smoke live MP (secret + redeploy); frete real; permissões granulares (Bloco F STOP); cobertura ampla de aplicações; liberação comercial em escala; polimento F10; F9-F.

### D. Conflitante — ver tabela Parte 1.5.

### E. Obsoleto
Stack Nest/Prisma; lifecycle DRAFT→ATIVO como se fosse o modelo atual; fórmula única “publicado+lista+preço=available” sem regras independentes; F8.1 “ainda futura”.

### F. Falta
Ver Parte 3 (gaps).

### G. Visão futura
Enriquecimento externo, matching avançado, equivalências completas, APIs, analytics, novos canais, escala de catálogo.

---

## PARTE 1.5 — Contradições

| Tema | PRD antigo / rascunho | Roadmap 04/10 | Plano/auditoria | Situação | Decisão |
|------|----------------------|---------------|-----------------|----------|---------|
| Stack | Nest/Prisma/Next | Vite+Supabase | Vite+Supabase | Evidência técnica clara | **Consolida Vite+Supabase** |
| Status produto | Pré-desenvolvimento | F1–7 done | F8.1/F9 parciais | Evidência de operação | **Plataforma operacional em evolução** |
| F8.1 | Import genérico | “Futura” | Implementada + marchas | Evidência de código/docs | **Base CONCLUÍDA; gaps de dados/UX** |
| F9 | Mistura testes e produção | Integrações | F9-E local OK, live STOP | Evidência STOP G | **Código local ≠ produção validada** |
| Lifecycle produto | DRAFT→ATIVO… | — | `status` + `is_available` | Modelo F8 consolidado | **Preserva status+is_available; lifecycle longo = FUTURO** |
| Código referência | Rename de SKU / geração auto | — | UI label sobre `sku` | Implementação parcial | **Cadeia formal; geração distinta = DECISÃO PENDENTE** |
| Publicação | Fórmula única | — | Regras independentes + Liberar | Marchas 07/10 | **Regras independentes** |

---

## PARTE 2 — Estado real do projeto

| Área | Estado | Evidência | Pendência |
|------|--------|-----------|-----------|
| Fundação / arquitetura | CONCLUÍDO | ARCHITECTURE, F1–F2 | — |
| Catálogo loja (busca/PDP) | CONCLUÍDO (base) | F3–F4, F6 | Polimento UX F10 |
| Produtos admin | CONCLUÍDO (base) | F3, F8 | Identidade referência comercial |
| Classificação L3 | CONCLUÍDO | F8.4 | Seed L3 prepared (histórico) |
| Fornecedores / conversão | CONCLUÍDO | F8.1 | — |
| Custos | CONCLUÍDO | F8.1 + repair supplier_id | Operação contínua |
| Preços / listas | CONCLUÍDO (base) | F6B, F8.1–F8.4 | Consistência UI/liberação F10 |
| Importações (4+apps) | CONCLUÍDO / EM VALIDAÇÃO | F8.1, apply apps | Cobertura de dados apps |
| Estoque + modos | CONCLUÍDO | F7F, F8 | UX/relatórios F10 |
| Pedidos / ciclo | CONCLUÍDO | F7–F7E | — |
| Clientes admin | CONCLUÍDO (consulta) | F8 | Cadastro/ops F10 |
| Checkout | CONCLUÍDO (base) | F6 | Pós-pago / simulação F9-F |
| Pagamentos MP | EM ANDAMENTO / BLOQUEADO | F9-E STOP G | Secret, redeploy, smoke |
| Frete | EM ANDAMENTO | F6C mock/CEP | Provedor real A CONFIRMAR |
| Catálogo público completo | EM VALIDAÇÃO | Loja lista published; available seletivo | Liberação operacional |
| Aplicações veiculares | PARCIAL | PVC + import; cobertura limitada | Ampliar dados / F11 |
| Segurança / roles | PARCIAL | Roles + RLS | Permissões granulares F |
| Testes | PARCIAL | Vitest domínio/F9-E | E2E críticos F10 |
| Enriquecimento externo | FUTURO | — | F12 |
| Integrações escala | FUTURO | — | F12–F13 |

### Matriz domínio (resumo)

| Domínio | Existe | Implementado | Validado | Pendente | Próxima ação |
|---------|--------|--------------|----------|----------|--------------|
| Produtos | Sim | Sim | Parcial | Identidade/liberação | F10 |
| Catálogo | Sim | Sim | Parcial | Completude apps/imagens | F10/F11 |
| Fornecedores | Sim | Sim | Sim | — | Manter |
| Custos | Sim | Sim | Sim | Operação | Manter |
| Preços | Sim | Sim | Parcial | Consistência loja | F10 |
| Estoque | Sim | Sim | Sim | UX | F10 |
| Clientes | Sim | Consulta | Parcial | Polish | F10 |
| Pedidos | Sim | Sim | Sim | — | Manter |
| Checkout | Sim | Base | Parcial | Pós-pago | F9-F/F10 |
| Pagamentos | Sim | Código | Não live | Smoke | Humano + F9-F |
| Frete | Sim | CEP/mock | Parcial | Provedor | DECISÃO |
| Catálogo público | Sim | Base | Parcial | Available em escala | F10 |
| Importações | Sim | Sim | Parcial | Apps em massa | F10/F11 |
| Segurança | Sim | Base | Parcial | Granular | Bloco F |
| Testes | Sim | Unitário forte | Parcial | E2E | F10 |
| Integrações | Parcial | MP | Não prod | Frete/APIs | F9-F/F12 |
| Enriquecimento | Não | — | — | — | F12 |

---

## PARTE 3 — Gaps (P0–P4)

### P0

| Gap | Problema | Causa | Impacto | Próxima ação |
|-----|----------|-------|---------|--------------|
| G0 / FIND-001 | Schema remoto ≠ migrations git | Rebuild HF vs cadeia `fase*` | Pedidos/estoque/overrides/pricing profundos inválidos no remoto atual | **FAL-IMP-01** (diff + parecer D-SCHEMA) |

### P1 — Bloqueia operação plena

| Gap | Problema | Causa | Impacto | Próxima ação |
|-----|----------|-------|---------|--------------|
| G1 | Smoke MP live bloqueado | Secret/redeploy humano | Pagamento real não validado | Checklist STOP Bloco G |
| G2 | Maioria produtos `is_available=false` | Completude + gate Liberar | Loja pouco comprável | Onda 1: checklist Liberar (não auto-import) |
| G3 | Aplicações incompletas no catálogo | Dados nunca aplicados em escala | Busca por veículo fraca | Import apps + F11 |
| G2b | Quase sem custo/preço nos itens | Dados + resolução paralela | “Cadastrado ≠ vendável” | Onda 1 pós-schema |

### P2

| Gap | Problema | Próxima ação |
|-----|----------|--------------|
| G4 | Permissões granulares ausentes | Bloco F (STOP) |
| G5 | Frete ainda mock/parcial | Decidir provedor |
| G6 | UX/checkout pós-pago / estados | F10 |
| G7 | Copy/identidade referência vs SKU | Formalizar no PRD; decidir geração |

### P3

| Gap | Problema | Próxima ação |
|-----|----------|--------------|
| G8 | Completude de imagens/descrições | F11 |
| G9 | Relatórios/dashboard indicadores | F10/F11 |
| G10 | E2E regressão contínua | F10 |

### P4

| Gap | Problema | Próxima ação |
|-----|----------|--------------|
| G11 | Enriquecimento/matching/APIs | F12 |
| G12 | Escala multi-canal/analytics | F13 |

---

## PARTE 4 — Decisões (atualizado gate Fase 0)

### Decididas / direcionadas (eFe 2026-10-08)

1. **D-SCHEMA:** hipótese opção 1 (`fase*`), condicionada a IMP-01.  
2. **DIV-001:** item lista = com preço / sem preço.  
3. **DIV-002:** custo — regra única central/SQL.  
4. **D-REF:** referência comercial distinta do SKU (impl. Onda 1+).  
5. **D-LIBERAR:** checklist mínimo para massa (impl. Onda 1).

### Ainda pendentes

1. Provedor de **frete** em produção e quando substituir mock.  
2. Exibição de **fabricante** na vitrine (card vs PDP).  
3. Taxonomia definitiva se divergir do banco atual.  
4. Hierarquia de **autoridade de campos** no enriquecimento externo (F12).  
5. Confirmação final de apply D-SCHEMA se IMP-01 apontar mudança destrutiva.

---

## Respostas às 12 perguntas (§27 do prompt mestre)

1. **O que é a FAL?** Plataforma própria de operação e comércio de peças automotivas.  
2. **O que já temos?** Fundação F1–F7, operação comercial F8/F8.1, loja/checkout base, MP F9-E local.  
3. **O que funciona?** Pedidos, estoque, custos/preços, importações, busca, admin catálogo.  
4. **Parcial?** Pagamentos live, frete real, apps, liberação loja, permissões granulares.  
5. **Bloqueado?** Smoke MP (humano); Bloco F adiado.  
6. **O que falta?** F10 consolidação; F9-F; F11 catálogo mestre; F12–F13.  
7. **Prioridade?** Polir/consolidar/validar (F10) + desbloquear F9 smoke.  
8. **Futuro?** Enriquecimento, matching, escala, canais.  
9. **Fontes de verdade?** Ver PRD § Fontes de verdade.  
10. **Próxima fase?** F10 Consolidação operacional (após/com F9-F humano).  
11. **Critérios para avançar?** Gates do roadmap + Definition of Done do PRD.  
12. **O que não construir agora?** PIM/MDM/IA/multi-integrações prematuras.

---

## Tese

> A FAL possui uma plataforma própria em evolução, com base operacional já construída. A Fase 0 mostrou que o **schema em execução e o schema do git precisam ser a mesma arquitetura** antes de evoluir. Em seguida: **consolidar, polir, validar e completar** — sem duplicar regras ou fontes de verdade, e sem remendos por tela.
