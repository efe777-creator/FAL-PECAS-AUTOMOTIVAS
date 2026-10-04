# Documentação FAL Peças Automotivas 3.0

Pasta central de documentos. **Fonte de verdade** dos specs: `docs/entrada/`.  
**Roadmap oficial de execução:** `docs/planejamento/ROADMAP_FASES_3.0.md`.

## Estrutura

```text
docs/
├── README.md
├── entrada/                 # FONTE DE VERDADE (produto/specs)
│   ├── FAL_PRD_3.0.md       # PRD (não alterar sem autorização)
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── UX.md
│   ├── IMPORT.md
│   └── IDENTIDADE_VISUAL.md
└── planejamento/
    ├── ROADMAP_FASES_3.0.md
    ├── ESPECIFICACAO_FASE2_ARQUITETURA_DADOS.md
    ├── ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md
    ├── ESPECIFICACAO_FASE4_MOTOR_BUSCA.md
    ├── ESPECIFICACAO_FASE4B_ADMIN.md
    ├── ESPECIFICACAO_FASE5_CLIENTE.md
    ├── ESPECIFICACAO_FASE6_ECOMMERCE.md
    ├── ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md
    ├── EXECUCAO_FASE3.md
    ├── EXECUCAO_FASE4.md
    ├── EXECUCAO_FASE4B.md
    ├── EXECUCAO_FASE5.md
    ├── EXECUCAO_FASE6.md
    ├── EXECUCAO_FASE6B.md
    ├── RELATORIO_FASE3_COMPLETO_2026-10-03.md
    ├── AUDITORIA_FASE2_2026-10-03.md
    ├── AUDITORIA_FASE3_2026-10-03.md
    ├── AUDITORIA_FASE4_2026-10-03.md
    ├── AUDITORIA_FASE4B_2026-10-03.md
    ├── AUDITORIA_FASE5_2026-10-03.md
    ├── AUDITORIA_FASE6_2026-10-03.md
    ├── AUDITORIA_FASE6B_2026-10-03.md
    ├── AUDITORIA_UX_POS_F5_2026-10-03.md
    └── ALINHAMENTO_FASE1_PRD.md
```

## Fases (resumo)

| Fase | Spec / status |
|------|----------------|
| 1 | Fundação UI — concluída |
| 2 | [ESPECIFICACAO_FASE2…](planejamento/ESPECIFICACAO_FASE2_ARQUITETURA_DADOS.md) — concluída |
| 3 | [ESPECIFICACAO_FASE3…](planejamento/ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md) — concluída ([auditoria](planejamento/AUDITORIA_FASE3_2026-10-03.md) · [relatório](planejamento/RELATORIO_FASE3_COMPLETO_2026-10-03.md)) |
| 4 | [ESPECIFICACAO_FASE4…](planejamento/ESPECIFICACAO_FASE4_MOTOR_BUSCA.md) — concluída ([auditoria](planejamento/AUDITORIA_FASE4_2026-10-03.md)) |
| 4B | [ESPECIFICACAO_FASE4B…](planejamento/ESPECIFICACAO_FASE4B_ADMIN.md) — concluída ([auditoria](planejamento/AUDITORIA_FASE4B_2026-10-03.md)) |
| 5 | [ESPECIFICACAO_FASE5…](planejamento/ESPECIFICACAO_FASE5_CLIENTE.md) — concluída ([auditoria](planejamento/AUDITORIA_FASE5_2026-10-03.md)) |
| 6 | [ESPECIFICACAO_FASE6…](planejamento/ESPECIFICACAO_FASE6_ECOMMERCE.md) — concluída ([execução](planejamento/EXECUCAO_FASE6.md) · [auditoria](planejamento/AUDITORIA_FASE6_2026-10-03.md)) |
| 6B | [ESPECIFICACAO_FASE6B…](planejamento/ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md) — planejada ([execução](planejamento/EXECUCAO_FASE6B.md) · [auditoria planejamento](planejamento/AUDITORIA_FASE6B_2026-10-03.md); código após gate) |

## Como contribuir

1. Novos briefs/PRDs → `docs/entrada/`
2. Decisões de fase → `docs/planejamento/`
3. Não duplicar specs dentro de `fal-pecas/docs/` (lá há apenas ponteiros)
4. Branch `plan` para planejamento/implementação de fase; `dev` para integração antes de `main`

## Código da aplicação

App React: `fal-pecas/`  
Migrations: `fal-pecas/supabase/migrations/`  
Instalação e env: `fal-pecas/README.md`
