# Backlog de consolidação — FAL 3.0

**Data:** 2026-10-08  
**PRD:** [../entrada/FAL_PRD_3.0.md](../entrada/FAL_PRD_3.0.md)  
**Roadmap:** [./ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md)  
**Diagnóstico:** [./DIAGNOSTICO_CONSOLIDACAO_FAL_3.0_2026-10-08.md](./DIAGNOSTICO_CONSOLIDACAO_FAL_3.0_2026-10-08.md)  
**Protocolo:** [./PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md](./PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md)  
**Gate Fase 0:** [./AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md](./AUDITORIA_FAL_FASE0_PLANO_CORRECAO_2026-10-08.md) — **Onda 0 liberada**

---

## Agora — F10-O0 (schema)

| # | Item | Prioridade | Notas |
|---|------|------------|-------|
| 0 | Fase 0: raio-X + artefatos + gate | P0 | **Feito** — gate eFe Onda 0 (2026-10-08) |
| 1 | `FAL-IMP-01` + adendo runtime (`wtbp…` = canônico `fase*`) | P0 | **Feito** — A1/A2 desnecessários no runtime |
| 2 | `FAL-VAL-01` PASS + gate Onda 1 | P0 | **Feito** — Onda 1 liberada 2026-10-09 |
| 2d | Onda 1 | P1 | **Fechada** (02–10/07) — [STATUS](./STATUS_ONDA1_2026-10-09.md) · próximo Onda 2 / paralelos |
| 2b | Higiene migrations (`repair`) + apply `import_profiles` | P2 | Paralelo; não bloqueia regras Onda 1 |
| 2c | Apontar MCP Supabase para org/projeto runtime | P2 | Evitar auditar HF como loja |
| 3 | Desbloquear smoke MP (secret + redeploy + Pix/cartão sandbox) | P1 | STOP Bloco G — paralelo humano |

---

## Próximo — pós Onda 1 + F9-F / Bloco F

| # | Item | Prioridade | Notas |
|---|------|------------|-------|
| 1 | Onda 1 IMP-02…10/07 | P1 | **Feita** — ver STATUS_ONDA1 |
| 2 | Liberar D-LIBERAR | P1 | **Feito** IMP-10 |
| 3 | DIV-001 / DIV-002 / D-REF | P1 | **Feitos** |
| 4 | Ampliar aplicações via import (dados) | P1 | Residual FIND-004 |
| 5 | Onda 2 (`IMP-11`…) | P2 | Após fechamento Onda 1 |
| 6 | MARCHA F9-F (pós-smoke): checkout alinhado ao MP | P1 | Sem simulação enganosa |
| 7 | Permissões granulares (Bloco F) | P2 | STOP_BLOCO_F |
| 8 | Frete: decisão provedor + plano | P2 | D-FRETE pendente |
| 9 | Empty/loading/erros; dashboard/relatórios | P2–P3 | Onda 2 |
| 10 | Regressão vitest + E2E críticos | P2 | Após regras estáveis |

---

## Depois — F11 Catálogo mestre

| # | Item | Notas |
|---|------|-------|
| 1 | Taxonomia e completude operacional | |
| 2 | Aplicações em escala + qualidade de matching humano | |
| 3 | Referências / equivalências base | |
| 4 | Imagens e proveniência básica | |
| 5 | Políticas anti-lixo em import (categorias/veículos) | |

---

## Futuro — F12 / F13

| # | Item | Fase |
|---|------|------|
| 1 | Enriquecimento externo + autoridade por campo | F12 |
| 2 | Matching avançado / confiança | F12 |
| 3 | APIs e canais | F12–F13 |
| 4 | SEO, analytics, automações, escala de catálogo | F13 |

**Fora do backlog imediato:** PIM/MDM/ERP/WMS completos; matching por IA como obrigação; dezenas de integrações simultâneas.

---

## Ordem sugerida de MARCHAs

```text
Fase 0 — FEITO (artefatos + gate Onda 0)
    ↓
FAL-IMP-01 → FAL-VAL-01 (schema)
    ↓
eFe aprova Onda 1
    ↓
F10 Onda 1 — FECHADA (02–10/07)
    ↓
Onda 2 / Humano: smoke MP (paralelo) → F9-F
    ↓
Onda 2 — superfície / UX / E2E
    ↓
Bloco F permissões (quando autorizado)
    ↓
Gate F10 → F11
```
