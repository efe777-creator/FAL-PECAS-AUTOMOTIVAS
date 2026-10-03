# Alinhamento Fases × PRD 3.0

**Atualizado:** 2026-10-03  
**Status:** Roadmap de 10 fases adotado

## Contexto

O [PRD 3.0](../entrada/FAL_PRD_3.0.md) descreve a visão completa do produto (MVP e pós-MVP).  
A **Fase 1 — Fundação** foi aprovada com stack **React + Vite + TypeScript + Tailwind + Supabase**.  
O roadmap oficial de execução é [ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md) (substitui a interpretação do PRD §16).

## Divergência de stack (PRD §10 vs aprovado)

| Item | PRD §10 | Aprovado |
|------|---------|----------|
| Frontend | Next.js + App Router | **Vite + React SPA** |
| Backend | NestJS + Prisma | **Supabase (Auth, Postgres, Storage, RLS)** |
| Dev DB | SQLite | Postgres via Supabase |
| Monorepo | apps/web, apps/api, apps/admin… | App único `fal-pecas/` |
| API | REST Nest + OpenAPI | Cliente Supabase + services desacoplados |

## Pasta de documentos

- Specs: `docs/entrada/`
- Decisões de fase: `docs/planejamento/`
- App: `fal-pecas/` (`fal-pecas/docs/` só ponteiros)

## Status das fases (roadmap novo)

| Fase | Nome | Situação |
|------|------|----------|
| 1 | Fundação e estrutura visual | Concluída |
| 2 | Arquitetura de Dados e Estrutura Funcional | Em execução / schema aplicado |
| 3–10 | Catálogo → operação | Pendentes |

Spec Fase 2: [ESPECIFICACAO_FASE2_ARQUITETURA_DADOS.md](./ESPECIFICACAO_FASE2_ARQUITETURA_DADOS.md)
