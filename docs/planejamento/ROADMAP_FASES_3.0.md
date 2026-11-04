# Roadmap de Fases — FAL Peças Automotivas 3.0

**Status:** Fonte oficial de **execução** das fases  
**Atualização:** 2026-11-04 (pós-STOP α — sync PRD/ROADMAP)  
**PRD de produto:** [../entrada/FAL_PRD_3.0.md](../entrada/FAL_PRD_3.0.md)  
**Planejamento vigente:** [./FAL_AUDITORIA_COMPLETA_PENDENCIAS_2026-11-04.md](./FAL_AUDITORIA_COMPLETA_PENDENCIAS_2026-11-04.md) · [Backlog pós-α](./FAL_BACKLOG_POS_ALPHA_2026-11-04.md)  
**Fase α (encerrada):** [Estado final](./FAL_ESTADO_FINAL_ALPHA_2026-11-04.md) · [STOP formal](./FAL_STOP_ALPHA_FORMAL_2026-11-04.md)  
**Diagnóstico (histórico):** [./DIAGNOSTICO_CONSOLIDACAO_FAL_3.0_2026-10-08.md](./DIAGNOSTICO_CONSOLIDACAO_FAL_3.0_2026-10-08.md)  
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
| C | F9 | Pagamento + frete + hardening | **CONCLUÍDO α** — smoke Pix/cartão **PASS loja**; frete = D-FRETE **B**; ressalva webhook-MCP |
| D | F10 | Consolidação operacional | Onda 0–1 **ENCERRADA**; **pós-α em execução** (logística, produtos, pedidos) |
| α | Fase α | Operação comercial controlada | **ENCERRADA** 2026-11-04 (Gate SIM + STOP formal) |
| **D+** | **Pós-α** | **Regras de pedidos + logística + dados** | **FOCO ATUAL** — [auditoria](./FAL_AUDITORIA_COMPLETA_PENDENCIAS_2026-11-04.md) |
| E | F11 | Catálogo mestre | PLANEJADO (pós-α) |
| F | F12 | Enriquecimento | FUTURO |
| G | F13 | Escala comercial | FUTURO |

```text
CONCLUÍDO (F1–F8.1 + F10 Onda 0–1 + FIND-004 + F9-F código)
        ↓
Fase α ENCERRADA (Gate SIM · D-FRETE B · E2E pago 08da5ada · STOP formal)
        ↓
FOCO ATUAL → pós-α: regras de pedidos (Ondas 1–3) · cron expiry · dados de medidas · ops E2E entrega
        ↓
frete live (D-FRETE C / Melhor Envio) · domínio
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

**Gaps remanescentes do bloco B:** liberação comercial em escala; polimento UX; permissões granulares (Bloco F STOP).  
**FIND-004 M1–M5 (apps PVC published):** ENCERRADO 2026-10-09 — não reabrir sem finding.

---

## Bloco C — Checkout e integrações (F9) — CONCLUÍDO NA α (frete live pós-α)

**Pergunta:** Como conectamos pagamento/frete reais sem redesenhar o checkout?

### Escopo
Gateway de pagamento (Mercado Pago), webhook, frete/transportadoras (evolutivo), qualidade e hardening.

### Estado F9-E / F9-F (obrigatório)

> Webhook concurrency/hardening **concluído** (núcleo + Edge).  
> **H1–H5 PASS** 2026-10-14 (inclui `MP_WEBHOOK_SECRET` + webhook v4) — [H1H6 check](./FAL_MP_SMOKE_H1H6_CHECK_2026-10-14.md).  
> **F9-F IMPLEMENTADO** (RPC + checkout) — [VAL F9-F](./FAL_F9F_CHECKOUT_MP_METHODS_VAL_2026-10-10.md).  
> **Smoke Pix/cartão/approve:** **PASS loja** 2026-11-04 — pedido `08da5ada…` approved R$ 128,12 ([VAL](./FAL_MARCHA_SMOKE_MP_S2_APPROVE_WEBHOOK_VAL_2026-11-04.md)). Ressalva: `notifications_history` MCP não observado.  
> Frete: D-FRETE **B assinado** (mock/sandbox + aviso); live = **C** / Melhor Envio pós-α.

### Critérios de saída F9 (bloco C) — comerciais
- Smoke Pix + cartão sandbox documentado
- Webhook approve no smoke (ou NÃO TESTÁVEL + aceite)
- Checkout alinhado ao provider ativo (sem simulação enganosa)
- Frete: política D-FRETE assinada (α: B) + caminho feliz coerente

---

## Bloco D — Fase 10 — Consolidação operacional — ONDA 0–1 ENCERRADA

**Foco atual do projeto:** pós-α — ver [auditoria completa](./FAL_AUDITORIA_COMPLETA_PENDENCIAS_2026-11-04.md) (Fase α encerrada 2026-11-04).  
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

### F10-O0 — Fundação schema (FEITO)

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
