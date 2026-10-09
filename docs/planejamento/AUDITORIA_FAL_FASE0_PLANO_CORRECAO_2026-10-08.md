# Auditoria FAL Fase 0 — Plano de correção

**Data:** 2026-10-08  
**Status:** **GATE APROVADO — Onda 0 liberada**  
**Protocolo:** [PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md](./PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md)  
**Entradas:** [MAPA](./AUDITORIA_FAL_FASE0_MAPA_2026-10-08.md) · [INVENTÁRIO](./AUDITORIA_FAL_FASE0_INVENTARIO_2026-10-08.md) · [FINDINGS](./AUDITORIA_FAL_FASE0_FINDINGS_2026-10-08.md) · [CAUSAS](./AUDITORIA_FAL_FASE0_CAUSAS_RAIZ_2026-10-08.md)

**Liberado agora:** somente `FAL-IMP-01` → `FAL-VAL-01` (Onda 0).  
**Bloqueado:** `FAL-IMP-02+` até aprovação explícita da Onda 1 após `FAL-VAL-01`.  
**IMP-01:** [parecer HF](./FAL_IMP_01_SCHEMA_DIFF_PARECER_2026-10-08.md) + **[adendo runtime](./FAL_IMP_01_ADDENDUM_RUNTIME_CANONICO_2026-10-08.md)** — runtime `wtbp…` já é `fase*`; A1 cancelado.  
**VAL-01:** [FAL_VAL_01_RUNTIME_SCHEMA_2026-10-08.md](./FAL_VAL_01_RUNTIME_SCHEMA_2026-10-08.md) — **PASS essencial**; aguarda gate Onda 1.

---

## 1. Objetivo do plano

Transformar causas-raiz em onda ordenada de implementação F10, sem remendos por tela, com reauditoria por bloco (`FAL-VAL-N`).

Hierarquia oficial pós-Fase 0:

```text
SCHEMA CONFIÁVEL
        ↓
DADOS CONFIÁVEIS
        ↓
REGRAS COMERCIAIS ÚNICAS
        ↓
CATÁLOGO / LOJA
        ↓
INTEGRAÇÕES
        ↓
F11+ (catálogo mestre / enriquecimento / escala)
```

---

## 2. Decisões (eFe — 2026-10-08)

| ID | Status | Decisão |
|----|--------|---------|
| **D-SCHEMA** | Hipótese preferencial (condicional ao IMP-01) | **Opção 1:** reaplicar/reconstruir a partir das migrations `fase*` do git no projeto canônico — **desde que** o diff de `FAL-IMP-01` confirme que elas representam a arquitetura pretendida. Opção 2 (remoto HF oficial) **não** automática. Opção 3 (projeto limpo) só se git e remoto forem ambos não confiáveis. |
| **DIV-001** | **Decidido** | **B** — item de lista = “com preço / sem preço”; **não** criar `active/inactive` no item agora. Lista continua `draft` / `active` / `inactive`. |
| **DIV-002** | **Decidido** | Unificar resolução de custo (incl. fallback FAL-SUP-01 se oficial) na **camada central/SQL**; remover duplicidade do TS. Entrega na Onda 1 (`FAL-IMP-08`). |
| **D-REF** | **Direção aprovada** | Referência comercial **distinta** de `sku` (modelo de identidade). Implementação **não** na Onda 0 (Onda 1+ / `FAL-IMP-03`). |
| **D-LIBERAR** | **Direção aprovada** | Liberação em massa só com **checklist mínimo**. Sem “selecionar N → publicar”. Implementação Onda 1 (`FAL-IMP-10`). |
| **D-FRETE** | Pendente | Paralelo humano; não bloqueia Onda 0. |
| **Escopo liberado** | **Onda 0 apenas** | `FAL-IMP-01` → `FAL-VAL-01`. |

Sem alinhamento de schema validado (`FAL-VAL-01`), implementação profunda de pedidos/estoque/overrides/pricing no remoto atual permanece **inválida**.

---

## 3. O que NÃO será alterado e por quê

| Item | Por quê |
|------|---------|
| Independência HF como autoridade universal | PRD: HF é fonte, não dono |
| Separação `status` × `is_available` | Modelo consolidado F8 |
| D16 (`price_origin` calculated/imported/manual) | Anti-circularidade validada em testes |
| Não auto-publicar import | Regra de negócio explícita |
| `priority` das listas (ex.: 100 na Promocional) | Regra real de desempate (FIND-018) — documentar, não remover |
| Storybook / Figma / MCP FAL dedicado | Fora do v1 |
| F11–F13 (PIM, matching IA, multi-canal) | Depois do gate F10 completo |
| Pedidos/estoque profundos antes do schema | FIND-001 / CR-01 |

---

## 4. Ondas de implementação

Ordem ajustada pela auditoria (schema primeiro). Códigos = protocolo §9.

### Onda 0 — Fundação schema (LIBERADA)

`FAL-IMP-01` **não** é para “consertar tudo”. É para descobrir e consolidar qual banco temos e qual o FAL deve ter.

| Cmd | Entregáveis obrigatórios |
|-----|--------------------------|
| `FAL-IMP-01` | 1) Diff completo git migrations (`fase*`) × schema remoto (`hf_f1_*` + tabelas/RPCs) · 2) Inventário tabelas/RPCs obrigatórias vs presentes · 3) Parecer: opção 1 viável / gaps / risco opções 2–3 · 4) Proposta mínima de alinhamento (confirmação extra se destrutiva) · 5) Só então alterações de schema necessárias ao alinhamento canônico — **sem** Onda 1 |
| `FAL-VAL-01` | Diff revalidado; smoke SQL das RPCs críticas presentes; app sobe contra banco alinhado (ou STOP documentado se ainda não alinhável) |

Findings / CR: CR-01, FIND-001.

### Onda 1 — Dados e regras (**LIBERADA** 2026-10-09 — MARCHA eFe pós VAL-01)

| Cmd | Bloco | Status |
|-----|-------|--------|
| `FAL-IMP-02` | Dados / normalização | **Feito** |
| `FAL-IMP-03` | Códigos/slugs + D-REF | **Feito** |
| `FAL-IMP-08` | Preços + DIV-002 | **Feito** |
| `FAL-IMP-09` | Listas (DIV-001 B) | **Feito** |
| `FAL-IMP-06` | Import + histórico UI | **Feito** |
| `FAL-IMP-05` | Veículos/apps (código; dados parcial) | **Feito** (código) |
| `FAL-IMP-10` | Loja / Liberar (D-LIBERAR) | **Feito** |
| `FAL-IMP-07` | Produto card/PDP | **Feito** |

Cada IMP seguido de `FAL-VAL-N`. Quadro vivo: [STATUS_ONDA1_2026-10-09.md](./STATUS_ONDA1_2026-10-09.md).

### Onda 2 — Superfície / operação (após Onda 1)

`FAL-IMP-11` … `FAL-IMP-25` conforme plano original.  
**Não** aprofundar `FAL-IMP-14` pedidos / estoque sem schema alinhado.

### Paralelo humano

- Smoke MP (FIND-005) — STOP Bloco G  
- Decisão frete (D-FRETE)

---

## 5. Critérios de saída do gate Fase 0

- [x] Li o MAPA / INVENTÁRIO / FINDINGS / CAUSAS / este PLANO  
- [x] **D-SCHEMA** — hipótese preferencial opção 1, condicionada ao IMP-01  
- [x] DIV-001 e DIV-002 decididos  
- [x] Autorizo iniciar `FAL-IMP-01` (**somente Onda 0**)  
- [x] Problemas novos voltam ao ciclo evidência→causa (regra divergência)

### Registro de aprovação

| Campo | Valor |
|-------|-------|
| Aprovador | eFe |
| Data | 2026-10-08 |
| D-SCHEMA | Opção 1 como hipótese preferencial, condicionada à validação de FAL-IMP-01 |
| DIV-001 | B — “com preço / sem preço” |
| DIV-002 | Unificar regra na camada central/SQL; remover duplicidade do TS |
| D-REF | Direção: referência comercial distinta do SKU (impl. Onda 1+) |
| D-LIBERAR | Checklist mínimo para massa (impl. Onda 1 / IMP-10) |
| Escopo liberado (gate 2026-10-08) | **Somente Onda 0** |
| Gate Onda 1 | **Liberada 2026-10-09** (MARCHA eFe pós VAL-01) |
| Observações | Onda 0 concluída. Onda 1 **fechada** (02–10/07). Próximo: Onda 2 / paralelos. |

---

## 6. Comandos Cursor após este gate

```text
1) FAL-IMP-01     → diff + parecer + alinhamento mínimo (Onda 0)
2) FAL-VAL-01
3) eFe aprova Onda 1 (novo gate)
4) FAL-IMP-02 … conforme Onda 1
```

Texto IMP-01:

```text
Comando: FAL-IMP-01
Protocolo: docs/planejamento/PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md
Plano: docs/planejamento/AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md
Gate: Onda 0 aprovada (eFe 2026-10-08).

Execute APENAS a Onda 0. Não inicie FAL-IMP-02+.
Produza diff git migrations × remoto, inventário RPCs/tabelas,
parecer D-SCHEMA (hipótese opção 1) e proposta mínima.
Alterações destrutivas exigem confirmação explícita adicional.
Ao terminar, execute / aguarde FAL-VAL-01.
```

---

## 7. Resumo executivo (atualizado 2026-10-09)

1. **Runtime canônico:** `wtbp…` já `fase*` (VAL-01 PASS). MCP HF ≠ loja.  
2. **Onda 1:** **fechada** (02/03/08/09/06/05/10/07) — [STATUS](./STATUS_ONDA1_2026-10-09.md).  
3. **Runtime comercial:** ~100 published / ~99 available — FIND-002 legado (HF) desatualizado.  
4. **Decisões entregues:** DIV-001, DIV-002, D-REF, D-LIBERAR.  
5. **Congelado:** D16, status≠available, anti-auto-publish, priority, HF≠dono, F11+.

**Próximo passo:** Onda 2 (`FAL-IMP-11`…) e/ou paralelos (MP, frete, import apps dados, repair).
