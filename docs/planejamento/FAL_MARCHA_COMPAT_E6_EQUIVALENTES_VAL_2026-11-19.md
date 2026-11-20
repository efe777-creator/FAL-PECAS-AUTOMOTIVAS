# VAL — Marcha 5: E.6 Equivalentes técnicos (admin + PDP)

**Data:** 2026-11-19 · **Branch:** `dev`  
**Canônico:** E.6 Admin ficha · Fase 6  
**Distinto de:** `product_related_links` (Relacionados comerciais)

## Aceite

| Critério | Status |
|----------|--------|
| Tabela `product_equivalences` + RLS staff/public | PASS (migration) |
| Admin: buscar + Vincular + Remover | PASS (código) |
| Bidirecional automático (A↔B) | PASS (código) |
| Evidência default `cadastro_interno_fal` | PASS |
| Sem reusar related_links | PASS |
| PDP bloco Equivalentes técnicos (se houver vínculos) | PASS (código) |
| Transitividade | N/A (não implementada — correto) |

## Migration

`fal-pecas/supabase/migrations/20261119234500_product_equivalences.sql`

Aplicar no projeto remoto antes de usar a UI em produção/homolog.

## Comandos

```bash
npx vitest run src/services/admin/adminProductEquivalenceService.test.ts
```

## Smoke admin

1. Abrir ficha de produto → seção **Equivalentes (técnicos)** abaixo de Relacionados.
2. Vincular por SKU → aparece nos dois produtos.
3. Remover em um lado → some nos dois.
4. PDP do produto A mostra bloco Equivalentes se B publicado.

**Assinatura:** MARCHA 5 E.6 equivalentes · 2026-11-19
