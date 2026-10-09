# Status Onda 1 — FAL 3.0

**Data:** 2026-10-09  
**Gate:** Onda 1 liberada (eFe pós VAL-01) · **fechada** 2026-10-09  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Feito

| Cmd | Bloco | Relatório |
|-----|-------|-----------|
| IMP-01 / VAL-01 | Schema runtime | [VAL-01](./FAL_VAL_01_RUNTIME_SCHEMA_2026-10-08.md) + [adendo](./FAL_IMP_01_ADDENDUM_RUNTIME_CANONICO_2026-10-08.md) |
| IMP-02 | Normalização | [IMP-02](./FAL_IMP_02_NORMALIZACAO_VAL_2026-10-09.md) |
| IMP-03 | D-REF / códigos | [IMP-03](./FAL_IMP_03_IDENTIDADE_VAL_2026-10-09.md) |
| IMP-08 | Preços + DIV-002 | [IMP-08](./FAL_IMP_08_PRECOS_DIV002_VAL_2026-10-09.md) |
| IMP-09 | Listas + DIV-001 B | [IMP-09](./FAL_IMP_09_LISTAS_DIV001_VAL_2026-10-09.md) |
| IMP-06 | Histórico importações | [IMP-06](./FAL_IMP_06_IMPORT_HISTORICO_VAL_2026-10-09.md) |
| IMP-05 | Veículos/apps (código) | [IMP-05](./FAL_IMP_05_VEICULOS_APPS_VAL_2026-10-09.md) |
| IMP-10 | Loja / Liberar D-LIBERAR | [IMP-10](./FAL_IMP_10_LIBERAR_VAL_2026-10-09.md) |
| IMP-07 | Card / PDP | [IMP-07](./FAL_IMP_07_CARD_PDP_VAL_2026-10-09.md) |

**Onda 1 (blocos liberados): FECHADA** 2026-10-09.

---

## Parcial / residual (não bloqueia fechamento)

| Item | Nota |
|------|------|
| FIND-004 apps | 17/100 com PVC — import dados em escala |
| FIND-006 preço | Liberar→resolve ok; carrinho UX ainda espelho |
| migration repair / `import_profiles` | P2 paralelo |
| MCP Supabase → wtbp | P2 paralelo |

---

## Pós-Onda 1 (em curso)

| Cmd | Bloco | Relatório |
|-----|-------|-----------|
| IMP-11 card M1–M5 | Visual card + apps | [VAL card](./FAL_IMP_11_CARD_VISUAL_VAL_2026-10-09.md) |
| IMP-11 M6 | Contrato PDP v0.1 | [Contrato](./FAL_CONTRATO_PDP_v0.1_2026-10-09.md) **aceito** |
| IMP-11 PDP | UI domínio PDP | [VAL PDP](./FAL_IMP_11_PDP_VAL_2026-10-09.md) |
| FIND-012 | Sort preço resolvido | [VAL](./FAL_FIND012_SORT_PRECO_VAL_2026-10-09.md) |
| FIND-003/004 | Recontagem wtbp | [doc](./FAL_FIND003_004_RECONTAGEM_WTBP_2026-10-09.md) — FIND-003 fechado (residual SK971); FIND-004 STOP |
| IMP-19 | UX U1–U5 | [VAL-19](./FAL_IMP_19_UX_VAL_2026-10-09.md) |
| MP smoke | Prep checklist | [prep](./FAL_MP_SMOKE_PREP_2026-10-09.md) |
| B3 repair | HOLD | [hold](./FAL_B3_MIGRATION_REPAIR_HOLD_2026-10-09.md) |

## Próximo (atualizado 2026-10-09 pós FIND-004 M3)

**Molde:** [FAL_STATUS_CONSOLIDADO_MOLDE_2026-10-09.md](./FAL_STATUS_CONSOLIDADO_MOLDE_2026-10-09.md)

| Frente | Estado | Condição |
|--------|--------|----------|
| `FIND-004` | M1–M5 **ENCERRADO** (100/100 PVC; smoke OK) | [M5 VAL](./FAL_FIND004_MARCHA5_SMOKE_VAL_2026-10-09.md); residual 21 reviews + TDI0150; UI Mais apps/anos = MARCHA UI |
| `UI apps` | Spec (Mais apps + `YY/YY`) | MARCHA UI explícita — não inventar PVC |
| `MP` | BLOQUEADO humano | [prep smoke](./FAL_MP_SMOKE_PREP_2026-10-09.md) |
| `B3` | HOLD | [HOLD repair](./FAL_B3_MIGRATION_REPAIR_HOLD_2026-10-09.md) |

IMP-14/15 permanecem bloqueados (schema / D-FRETE).

## Paralelo

- Smoke MP (FIND-005)  
- MARCHA UI apps/anos (trilho separado do apply)  
- D-FRETE (decisão)  
- Higiene migrations (só c/ auth B3)  

**Não** aprofundar IMP-14 pedidos/estoque sem necessidade schema.  
**Não** apply FIND-004 sem MARCHA 4 nomeada.
