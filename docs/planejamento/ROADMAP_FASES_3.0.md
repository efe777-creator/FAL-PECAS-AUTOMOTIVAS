# Roadmap de Fases — FAL Peças Automotivas 3.0

**Status:** Fonte oficial de **execução** das fases  
**Atualização:** 2026-10-08 (consolidação PRD Mestre 2.0)  
**PRD de produto:** [../entrada/FAL_PRD_3.0.md](../entrada/FAL_PRD_3.0.md)  
**Diagnóstico:** [./DIAGNOSTICO_CONSOLIDACAO_FAL_3.0_2026-10-08.md](./DIAGNOSTICO_CONSOLIDACAO_FAL_3.0_2026-10-08.md)  
**Stack:** Vite + React + TypeScript + Tailwind + Supabase

---

## Regra de gate

Não iniciar a implementação da fase **N+1** sem cumprir os critérios de saída da fase **N** (exceto shells UI já criados na Fase 1).  
**STOP** documentado = decisão humana / credencial / smoke externo antes de MARCHA seguinte.

---

## Status atual (visão consolidada)

| Bloco | Fases | Nome | Status |
|-------|-------|------|--------|
| A | F1–F7 | Fundação + operação de pedidos | **CONCLUÍDO** |
| B | F8 / F8.1 | Operação comercial | **Base construída** (gaps de dados/UX) |
| C | F9 | Pagamento + frete + hardening | **F9-E local DONE → STOP → F9-F** |
| **D** | **F10** | **Consolidação operacional** | **F10-O0 agora** (Fase 0 gate Onda 0; `FAL-IMP-01`) |
| E | F11 | Catálogo mestre | PLANEJADO |
| F | F12 | Enriquecimento | FUTURO |
| G | F13 | Escala comercial | FUTURO |

```text
CONCLUÍDO (F1–F8.1)
        ↓
Fase 0 auditoria (FEITO) → gate Onda 0
        ↓
F10-O0 SCHEMA (FAL-IMP-01 / VAL-01)  ← agora
        ↓
F10 Onda 1+ DADOS / REGRAS / LOJA
        ↓
F9 (smoke humano + F9-F) em paralelo controlado
        ↓
F11 CATÁLOGO MESTRE
        ↓
F12 ENRIQUECIMENTO
        ↓
F13 ESCALA
```

---

## Bloco A — Fundação e operação (F1–F7) — CONCLUÍDO

| Fase | Nome | Status | Spec / auditoria |
|------|------|--------|------------------|
| 1 | Fundação e estrutura visual | Concluída | — |
| 2 | Arquitetura de dados | Concluída | ESPECIFICACAO_FASE2… |
| 3 | Catálogo comercial real | Concluída | AUDITORIA_FASE3… |
| 4 | Motor de busca | Concluída | AUDITORIA_FASE4… |
| 4B | Painel admin (polimento) | Concluída | — |
| 5 | Experiência do cliente | Concluída | — |
| 6 | E-commerce | Concluída | checkout + frete CEP + pagamento simulado |
| 6B | Listas de preços | Concluída | — |
| 6C | Endereços / CEP / frete | Concluída | — |
| 6D | Ciclo do pedido (docs) | Concluída | — |
| 7 / 7A–7F | Operação do pedido + estoque | **Concluída** | ESPECIFICACAO_FASE7… · AUDITORIA_FASE7_FINAL… |

**Critério de saída do bloco A:** cumprido — operação de pedido pago até entrega com estoque consistente.

---

## Bloco B — Operação comercial (F8 / F8.1) — BASE CONSTRUÍDA

### Fase 8 — Back office (Fatia A) — CONCLUÍDA

- UI estoque + modos `com_estoque` \| `estoque_ficticio` \| `sem_estoque`
- Snapshot `inventory_mode_at_order`
- Consulta de clientes; relatórios mínimos  
Specs: [ESPECIFICACAO_FASE8_BACKOFFICE.md](./ESPECIFICACAO_FASE8_BACKOFFICE.md) · [AUDITORIA_FASE8_2026-10-04.md](./AUDITORIA_FASE8_2026-10-04.md)

### Fase 8.1 — Catálogo operacional / importações / preços — BASE CONCLUÍDA

Escopo entregue (não mais “futura”):

- Import catálogo, conversão fornecedor, custo, preço (prévia → apply → auditoria)
- Formação markup / margem / fixo; `price_origin`; D16
- UX listas / consulta rápida / classificação L3
- Marchas posteriores: precificação operacional, Código referência (UI), Liberar na loja, repair custo↔supplier_id

Specs: [ESPECIFICACAO_FASE8_1_IMPORTACAO_CATALOGO.md](./ESPECIFICACAO_FASE8_1_IMPORTACAO_CATALOGO.md) · [ESPECIFICACAO_FASE8_1_LISTAS_PRECOS_UX.md](./ESPECIFICACAO_FASE8_1_LISTAS_PRECOS_UX.md)

**Gaps remanescentes do bloco B (vão para F10/F11):** cobertura de aplicações; liberação comercial em escala; polimento UX; permissões granulares (Bloco F STOP).

---

## Bloco C — Checkout e integrações (F9) — EM ANDAMENTO / BLOQUEADO

**Pergunta:** Como conectamos pagamento/frete reais sem redesenhar o checkout?

### Escopo
Gateway de pagamento (Mercado Pago), webhook, frete/transportadoras (evolutivo), qualidade e hardening.

### Estado F9-E (obrigatório)

> Webhook concurrency/hardening **concluído localmente** (núcleo + Edge, 13 testes Vitest + build).  
> Smoke live/sandbox **pendente** (`MP_WEBHOOK_SECRET` + redeploy).  
> **STOP** — ver [STOP_BLOCO_G_PAGAMENTOS_2026-10-07.md](./STOP_BLOCO_G_PAGAMENTOS_2026-10-07.md) · [RELATORIO_FINAL_F9E…](./RELATORIO_FINAL_F9E_WEBHOOK_HARDENING_2026-10-06.md)

### Critérios de entrada F9-F
- Secret configurado + função redeployada **ou** decisão explícita de seguir só com sandbox documentado
- Checklist Bloco G

### Critérios de saída F9 (bloco C)
- Smoke Pix + cartão sandbox (ou produção controlada) documentado
- Checkout alinhado ao provider ativo (sem simulação enganosa)
- Frete: caminho feliz com regra atual + plano do provedor real (DECISÃO PENDENTE)

---

## Bloco D — Fase 10 — Consolidação operacional — PRÓXIMO FOCO

**Pergunta:** O que já construímos funciona como **uma única plataforma coerente**?

**Protocolo operacional:** [./PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md](./PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md)  
**Plano Fase 0 (gate):** [./AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md](./AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md) — **GATE APROVADO — Onda 0 liberada (2026-10-08)**

### Hierarquia oficial (schema-first)

```text
SCHEMA CONFIÁVEL → DADOS → REGRAS ÚNICAS → CATÁLOGO / LOJA → INTEGRAÇÕES → F11+
```

`FAL-VAL-01` PASS + Onda 1 **fechada** (2026-10-09). Ver [STATUS_ONDA1](./STATUS_ONDA1_2026-10-09.md).  
Ainda **não** aprofundar pedidos/estoque (`FAL-IMP-14`+) sem schema alinhado; nem PIM.

### Fase 0 — Auditoria (FEITO)

Artefatos `AUDITORIA_FAL_FASE0_*_2026-10-08.md` produzidos. Gate eFe: **somente Onda 0**.

### F10-O0 — Fundação schema (AGORA)

| Cmd | Objetivo | Status |
|-----|----------|--------|
| `FAL-IMP-01` | Diff + parecer | Feito (MCP=HF) + **[adendo runtime](./FAL_IMP_01_ADDENDUM_RUNTIME_CANONICO_2026-10-08.md)** |
| Canônico | App = `wtbp…` já em `fase*` | **Confirmado** — sem projeto novo |
| `FAL-VAL-01` | Validar schema runtime | **PASS essencial** — [VAL-01](./FAL_VAL_01_RUNTIME_SCHEMA_2026-10-08.md) |

Bloqueador FIND-001 no MCP HF **não se aplica** ao runtime. Onda 1: **fechada**. Ver [STATUS_ONDA1_2026-10-09.md](./STATUS_ONDA1_2026-10-09.md).

### F10 — Consolidação (Onda 1 fechada)

### Objetivo
Polir, consolidar, validar e completar a base operacional — **não** reconstruir; **não** é só embelezamento visual.  
Ciclo: auditar → evidências → causa-raiz → propor → dependências → implementar → testar → reauditar.

### Escopo (Onda 1+)
- Dados comerciais (custo/preço/apps) e completude
- Preços com **uma** resolução; listas (item = com/sem preço)
- Disponibilidade (`status` + `is_available`), Liberar com checklist
- Importações (histórico unificado)
- UX administrativa e de checkout (estados, mensagens, loading, empty, erros)
- Estoque / pedidos — **só** com schema alinhado
- Permissões (Bloco F quando autorizado)
- Responsividade; regressão; copy/vocabulário; D-REF (referência comercial distinta)

### Dependências
- Bloco B estável; F9-E local ok  
- Ideal: smoke F9 desbloqueado em paralelo (humano)
- **Fase 0 feita; VAL-01 PASS; Onda 1 fechada — próximo Onda 2 / paralelos**

### Critérios de entrada
- PRD Mestre 2.0 + este roadmap  
- Diagnóstico + artefatos Fase 0  
- Gate Fase 0 (Onda 0) aprovado  

### Critérios de saída
- Schema alinhado (VAL-01) + gaps P1 tratados ou STOP  
- E2E críticos admin + cliente + custo documentados  
- Build + suíte vitest relevantes verdes  
- Relatório de marcha F10

### Riscos
- Implementar sobre schema divergente  
- Liberação em massa sem checklist  
- Misturar F11 (catálogo mestre) dentro de F10 sem gate  
- Remendos por tela sem causa-raiz

---

## Bloco E — Fase 11 — Catálogo mestre — PLANEJADO

**Objetivo:** aprofundar catálogo técnico-comercial estruturado.

### Escopo
Taxonomia; fabricantes; montadoras/veículos/versões/motores; aplicações em escala; referências; equivalências (base); imagens; qualidade/completude.

### Dependências
F10 gate (plataforma coerente).

### Critérios de saída
- Cobertura de aplicações nos produtos prioritários  
- Políticas de cadastro sem lixo (categorias/veículos)  
- Indicadores de completude operacionais (quando definidos)

---

## Bloco F — Fase 12 — Enriquecimento — FUTURO

Fonte externa → ingestão → normalização → matching → confiança → revisão → aplicação → auditoria.  
APIs, bases externas, equivalências avançadas, imagens com proveniência.  
**Não iniciar** sem hierarquia de autoridade de campos (DECISÃO PENDENTE).

---

## Bloco G — Fase 13 — Escala comercial — FUTURO

SEO, expansão de catálogo, analytics, automações, novos canais, otimizações.  
Exige F10–F11 estáveis e política de integrações.

---

## Mapeamento histórico PRD antigo §16 → este roadmap

| PRD antigo | Roadmap |
|------------|---------|
| Planejamento / fundação | F1–F2 |
| Catálogo / loja | F3–F6 |
| Admin / operação | F7–F8.1 |
| Testes / produção | F9–F10 (+ F13) |
| (novo) Consolidação | **F10** |
| (novo) Catálogo mestre / enriquecimento / escala | **F11–F13** |

---

## O que não fazer neste roadmap

- Tratar F8.1 como “ainda não começou”  
- Afirmar produção MP validada sem smoke  
- Pular F10 para construir PIM/matching/IA  
- Auto-publicar importações  
- Criar engines paralelas de preço/estoque
