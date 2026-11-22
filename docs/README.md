# Documentação FAL Peças Automotivas

Pasta central. **Autoridade e ordem de leitura:** [entrada/FAL_INDICE_CANONICO.md](entrada/FAL_INDICE_CANONICO.md).

| Tipo | Fonte canônica |
|------|----------------|
| **Índice / autoridade** | [`entrada/FAL_INDICE_CANONICO.md`](entrada/FAL_INDICE_CANONICO.md) |
| **PRD de produto** | [`entrada/FAL_PRD_4.0.md`](entrada/FAL_PRD_4.0.md) |
| **Dados / SoT** | [`arquitetura/FAL_DADOS_FONTES_VERDADE.md`](arquitetura/FAL_DADOS_FONTES_VERDADE.md) |
| **Veículo · caminhos · relações · layout** | [`arquitetura/FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md`](arquitetura/FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md) |
| **Layout admin / Adaptive** | [`planejamento/FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md`](planejamento/FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md) |
| **Roadmap** | [`planejamento/FAL_ROADMAP_MESTRE_4.0.md`](planejamento/FAL_ROADMAP_MESTRE_4.0.md) |
| Histórico PRD 3.0 | [`entrada/FAL_PRD_3.0.md`](entrada/FAL_PRD_3.0.md) — supersedido |

---

## Estrutura

```text
docs/
├── README.md                 # ponteiro (este arquivo)
├── entrada/                  # índice, PRD 4.0, visão
├── arquitetura/              # SoT dados, mapa veículo, 360
├── planejamento/             # planos, MARCHAs, VALs, padrões UX/layout
├── futuro/                   # visão — não implementar sem gate
└── superpowers/              # specs/plans de sessão
```

---

## Como contribuir

1. Regra de produto → PRD 4.0 (via índice).  
2. SoT de dados / writers veículo → Fontes de Verdade + Mapa veículo.  
3. Layout admin → Padrão Telas Layout (bump + antiregress).  
4. Execução tática → `docs/planejamento/` (MARCHA/VAL); **não** recopiar regra canônica.  
5. Não duplicar specs em `fal-pecas/docs/` (só ponteiros).  
6. Branch: trabalho em `dev`; `main` só com autorização eFe.  
7. Uma verdade: cada regra tem **um** dono; o resto linka.

---

## Código

App: `fal-pecas/` · Migrations: `fal-pecas/supabase/migrations/` · Env: `fal-pecas/README.md`
