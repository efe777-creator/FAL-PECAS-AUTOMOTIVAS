# Documentação FAL Peças Automotivas 3.0

Pasta central de documentos. **Fonte de verdade** dos specs: `docs/entrada/`.  
**Roadmap oficial de execução:** `docs/planejamento/ROADMAP_FASES_3.0.md`.

## Estrutura

```text
docs/
├── README.md
├── entrada/                 # FONTE DE VERDADE (produto/specs)
│   ├── FAL_PRD_3.0.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── UX.md
│   ├── IMPORT.md
│   └── IDENTIDADE_VISUAL.md
└── planejamento/
    ├── ROADMAP_FASES_3.0.md
    ├── ESPECIFICACAO_FASE2… → FASE6 / 6B / 6C / 6D / FASE7
    ├── EXECUCAO_FASE3… → FASE7 / FASE7A
    ├── AUDITORIA_FASE2… → FASE7_2026-10-04
    └── …
```

## Fases (resumo)

| Fase | Spec / status |
|------|----------------|
| 1 | Fundação UI — concluída |
| 2 | [ESPECIFICACAO_FASE2…](planejamento/ESPECIFICACAO_FASE2_ARQUITETURA_DADOS.md) — concluída |
| 3 | [ESPECIFICACAO_FASE3…](planejamento/ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md) — concluída |
| 4 | [ESPECIFICACAO_FASE4…](planejamento/ESPECIFICACAO_FASE4_MOTOR_BUSCA.md) — concluída |
| 4B | [ESPECIFICACAO_FASE4B…](planejamento/ESPECIFICACAO_FASE4B_ADMIN.md) — concluída |
| 5 | [ESPECIFICACAO_FASE5…](planejamento/ESPECIFICACAO_FASE5_CLIENTE.md) — concluída |
| 6 | [ESPECIFICACAO_FASE6…](planejamento/ESPECIFICACAO_FASE6_ECOMMERCE.md) — concluída |
| 6B | [ESPECIFICACAO_FASE6B…](planejamento/ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md) — concluída |
| 6C | Endereços / CEP / frete — concluída |
| 6D | [ESPECIFICACAO_FASE6D…](planejamento/ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md) — docs concluídos |
| 7A | [EXECUCAO_FASE7A…](planejamento/EXECUCAO_FASE7A.md) — fundação concluída |
| **7** | [ESPECIFICACAO_FASE7…](planejamento/ESPECIFICACAO_FASE7_OPERACAO_PEDIDOS.md) · [EXECUCAO](planejamento/EXECUCAO_FASE7.md) · [auditoria final](planejamento/AUDITORIA_FASE7_FINAL_2026-10-04.md) — **concluída** |
| 7B–7F | Recepção → separação → expedição → entrega → estoque — concluídas |
| Pré-F7 | [Ajuste global preços](planejamento/AUDITORIA_AJUSTE_GLOBAL_PRECOS_2026-10-04.md) — gate aprovado |
| 8–10 | Back office / integrações / go-live — pendentes |

## Como contribuir

1. Novos briefs/PRDs → `docs/entrada/`
2. Decisões de fase → `docs/planejamento/`
3. Não duplicar specs dentro de `fal-pecas/docs/` (lá há apenas ponteiros)
4. Branch `plan` para planejamento/implementação de fase; `dev` para integração antes de `main`

## Código da aplicação

App React: `fal-pecas/`  
Migrations: `fal-pecas/supabase/migrations/`  
Instalação e env: `fal-pecas/README.md`
