# Auditoria FAL Fase 0 — Causas-raiz

**Data:** 2026-10-08  
**Método:** agrupar findings por causa (não por tela)  
**Fonte:** [FINDINGS](./AUDITORIA_FAL_FASE0_FINDINGS_2026-10-08.md)

---

## CR-01 — Duas linhagens de schema (git fase* × remoto hf_f1_*)

**Findings:** FIND-001, FIND-006 (RPC ausente), FIND-014 (orders), parte de FIND-007  
**Sintoma:** features “existem no código” mas não no banco ligado.  
**Camada responsável:** infraestrutura / migrations / escolha de projeto Supabase.  
**Correção na raiz:** escolher linhagem oficial; reconciliar (rebase migrations ou reaplicar); documentar projeto canônico; gate técnico antes de F10 profundo.  
**Blocos IMP afetados:** 01 Arquitetura, depois 08–16 conforme schema.

---

## CR-02 — Cadeia comercial incompleta nos dados (custo → preço → liberar)

**Findings:** FIND-002, FIND-003  
**Sintoma:** published em massa, available≈0, preços/custos≈0.  
**Camada responsável:** operação de dados + regras Liberar (não bug de CSS).  
**Correção na raiz:** popular custo/supplier; materializar itens de lista; liberar com checklist; **não** mascarar com mock de available.  
**Blocos:** 06 Import, 08 Preços, 09 Listas, 10 Loja.

---

## CR-03 — Cobertura de aplicações nunca aplicada em escala

**Findings:** FIND-004  
**Sintoma:** filtros veículo / card “sob consulta”.  
**Camada:** dados + import apps (motor já existe).  
**Correção:** marcha de import PVC; qualidade residual F11.  
**Blocos:** 05 Veículos, 06 Import, 11 Catálogo.

---

## CR-04 — Múltiplas resoluções de preço / espelho legado

**Findings:** FIND-006, FIND-010, FIND-012, DIV-002  
**Sintoma:** preview ≠ apply ≠ card ≠ carrinho ≠ Liberar.  
**Camada:** serviços pricing + RPCs + pontos de leitura UI.  
**Correção:** uma função oficial de resolução em todas as leituras comerciais; espelho só projeção controlada; unificar custo base.  
**Blocos:** 08, 09, 10, 11, 16.

---

## CR-05 — Integrações comerciais ainda sandbox / STOP humano

**Findings:** FIND-005, FIND-008, FIND-015  
**Sintoma:** frete mock; MP sem smoke; método placeholder.  
**Camada:** env + Edge + decisão provedor.  
**Correção:** checklist humano MP; decisão frete; F9-F alinhamento checkout.  
**Blocos:** 15 Frete, 16 Checkout — em paralelo controlado à F10.

---

## CR-06 — Observabilidade operacional de import incompleta

**Findings:** FIND-009  
**Sintoma:** auditoria só na lista de preços.  
**Camada:** UI admin sobre `imports` (staging já existe).  
**Correção:** histórico unificado por kind.  
**Blocos:** 06.

---

## CR-07 — Vocabulário e superfície UX não consolidados

**Findings:** FIND-011, FIND-013 (feedback), FIND-019, FIND-021, FIND-022, FIND-018  
**Sintoma:** SKU vs Código referência; EN/PT; empty/loading; priority sem copy.  
**Camada:** `productLabels` + copy admin/loja.  
**Correção:** vocabulário oficial; não remover `priority` (regra real).  
**Blocos:** 19–23.

---

## CR-08 — Escopo de produto “lista item ativo” vs modelo atual

**Findings:** DIV-001  
**Sintoma:** Prompt Mestre descreve active/inactive no item; schema não tem.  
**Camada:** produto/PRD (decisão), não bug.  
**Correção:** **Decidido B** (eFe 2026-10-08) — item = com preço / sem preço; atualizar PRD/UI na Onda 1 (`FAL-IMP-09`).  
**Blocos:** 09.

---

## CR-09 — Features ausentes conscientes

**Findings:** FIND-016 (relacionados), FIND-017 (extra_cost R$), FIND-020 (morto)  
**Sintoma:** buracos ou placeholders.  
**Correção:** só com necessidade real pós-CR-01/02; evitar preencher vitrine com lixo.  
**Blocos:** 07, 08, 01 limpeza.

---

## Mapa causa → ordem

```text
CR-01 schema
  → CR-04 preço unificado (precisa RPC/tabelas)
  → CR-02 dados comerciais
  → CR-03 aplicações
  → CR-06 histórico import
  → CR-05 MP/frete (paralelo humano)
  → CR-07 UX/vocabulário
  → CR-08 decisão item lista
  → CR-09 extras conscientes
```

---

## Próximo artefato

→ [AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md](./AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md)
