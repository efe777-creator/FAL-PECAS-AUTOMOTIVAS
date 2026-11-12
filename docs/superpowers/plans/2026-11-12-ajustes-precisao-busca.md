# Ajustes de precisão busca / placas / categorias — Plan mirror

> **For agentic workers:** NÃO implementar código até o eFe aprovar o plano de execução no documento principal. Esta fase foi **auditoria + docs**.

**Documento principal:** [`docs/planejamento/FAL_AJUSTES_PRECISAO_BUSCA_PLACAS_CATEGORIAS_V1.md`](../../planejamento/FAL_AJUSTES_PRECISAO_BUSCA_PLACAS_CATEGORIAS_V1.md)

## Achado central

- Categoria “vazia” = **dados** (produtos na raiz `direcao`, não nas folhas).
- Placa = parser já corrigido na MARCHA anterior; gaps: fab/modelo, casing, trim multi-token.
- IA = Groq NL opcional; **não** no hot path da placa.

## Após aprovação

Seguir tabela EXEC-* no documento principal (P0 dados → UX → year → IA homolog).
