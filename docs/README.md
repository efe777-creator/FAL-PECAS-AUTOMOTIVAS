# Documentação FAL Peças Automotivas 3.0

Pasta central de documentos.

| Tipo | Fonte canônica |
|------|----------------|
| **PRD de produto** | [`entrada/FAL_PRD_3.0.md`](entrada/FAL_PRD_3.0.md) — **PRD Mestre 2.0 (2026-10-08)** |
| **Roadmap de execução** | [`planejamento/ROADMAP_FASES_3.0.md`](planejamento/ROADMAP_FASES_3.0.md) |
| **Diagnóstico de consolidação** | [`planejamento/DIAGNOSTICO_CONSOLIDACAO_FAL_3.0_2026-10-08.md`](planejamento/DIAGNOSTICO_CONSOLIDACAO_FAL_3.0_2026-10-08.md) |
| **Backlog consolidação** | [`planejamento/BACKLOG_CONSOLIDACAO_FAL_3.0_2026-10-08.md`](planejamento/BACKLOG_CONSOLIDACAO_FAL_3.0_2026-10-08.md) |
| **Protocolo de auditoria (Cursor)** | [`planejamento/PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md`](planejamento/PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md) |
| **Gate Fase 0 / plano** | [`planejamento/AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md`](planejamento/AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md) — Onda 0 |
| **Schema Onda 0** | [adendo runtime](planejamento/FAL_IMP_01_ADDENDUM_RUNTIME_CANONICO_2026-10-08.md) + [VAL-01](planejamento/FAL_VAL_01_RUNTIME_SCHEMA_2026-10-08.md) — **runtime `wtbp…` PASS; gate Onda 1** |
| Specs técnicas de entrada | `entrada/ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `IMPORT.md`, `UX.md`, `IDENTIDADE_VISUAL.md` |

---

## Estrutura

```text
docs/
├── README.md
├── FAL_PRD_3.0.md           # stub → aponta para entrada/
├── entrada/                 # PRD + specs de produto/arquitetura
└── planejamento/            # roadmap, specs de fase, auditorias, STOPs
```

---

## Fases (resumo 2026-10-08)

| Bloco | Fases | Status |
|-------|-------|--------|
| A Fundação e operação | F1–F7 | **Concluído** |
| B Operação comercial | F8 / F8.1 | **Base construída** |
| C Integrações comerciais | F9 | F9-E local OK → **STOP smoke** → F9-F |
| **D Consolidação** | **F10** | **Onda 1** — IMP-02+03 feitos; próximo IMP-08 preços ([IMP-03](planejamento/FAL_IMP_03_IDENTIDADE_VAL_2026-10-09.md)) |
| E Catálogo mestre | F11 | Planejado |
| F Enriquecimento | F12 | Futuro |
| G Escala | F13 | Futuro |

Detalhe e gates: [planejamento/ROADMAP_FASES_3.0.md](planejamento/ROADMAP_FASES_3.0.md).

---

## Como contribuir

1. Visão/regras de produto → `docs/entrada/FAL_PRD_3.0.md` (após auditoria/consolidação)
2. Decisões e execução de fase → `docs/planejamento/`
3. Não duplicar specs dentro de `fal-pecas/docs/` (lá há apenas ponteiros)
4. Branch `plan` para planejamento/implementação de fase; `dev` para integração antes de `main`
5. **Não avançar fase sem gate**; PRD não autoriza implementar tudo de uma vez
6. **F10:** Fase 0 feita; gate **só Onda 0** — próximo `FAL-IMP-01` (schema). Sem `FAL-IMP-02+` até `FAL-VAL-01` + aprovação Onda 1

---

## Código da aplicação

App React: `fal-pecas/`  
Migrations: `fal-pecas/supabase/migrations/`  
Instalação e env: `fal-pecas/README.md`
