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
    └── ALINHAMENTO_FASE1_PRD.md
```

## Como contribuir

1. Novos briefs/PRDs → `docs/entrada/`
2. Decisões de fase → `docs/planejamento/`
3. Não duplicar specs dentro de `fal-pecas/docs/` (lá há apenas ponteiros)

## Código da aplicação

App React: `fal-pecas/`  
Migrations: `fal-pecas/supabase/migrations/`  
Instalação e env: `fal-pecas/README.md`
