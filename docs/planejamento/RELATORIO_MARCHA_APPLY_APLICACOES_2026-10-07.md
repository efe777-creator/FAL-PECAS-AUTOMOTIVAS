# Relatório MARCHA — Apply Importação Inteligente de Aplicações

**Data:** 2026-10-07  
**Status:** STOP (sem commit/push — aguarda autorização)

## 1. Auditoria (antes)

| Item | Estado |
|------|--------|
| Contrato `catalog_applications` | existia |
| Motor puro + prévia local | existia (sem DB) |
| UI importar-aplicacoes | só prévia; confirmar desabilitado |
| PVC `year_start`/`year_end` + `search_products` | remoto ok |
| `apply_*_applications` | **não existia** |
| Staging kind applications | **não existia** |

## 2. Alterações realizadas

### Client
- [applicationImportCore.ts](fal-pecas/src/services/import/applicationImportCore.ts) — catalogs, VV ambígua→revisão, expand split, payload congelado
- [adminApplicationsImportService.ts](fal-pecas/src/services/admin/adminApplicationsImportService.ts) — preview DB + create staging + apply(import_id)
- [AdminApplicationsImportPage.tsx](fal-pecas/src/pages/admin/products/AdminApplicationsImportPage.tsx) — resumo → confirmação → resultado

### SQL
- Migration [20261007140000_apply_catalog_applications_import.sql](fal-pecas/supabase/migrations/20261007140000_apply_catalog_applications_import.sql)
- Remoto: `slug_from_name` + `apply_catalog_applications_import` (security definer, grant authenticated)

## 3. Migrations / RPCs

| Nome | Papel |
|------|--------|
| `slug_from_name` | slug normalizado montadora/modelo |
| `apply_catalog_applications_import(uuid)` | apply transacional |

## 4. Regras de apply

- Executa action do payload; não recalcula decisão comercial
- Skip: review / error / already_covered
- Create product: draft + is_available=false + price=0
- VV: 1 match | PVC ligada | ambígua→revisão | create se aprovado
- Período: PVC only
- Reapply mesmo import_id: rejeitado
- Erro crítico: RAISE → rollback total (sem handler por linha)

## 5. Testes / build

- vitest import: **55 passed**
- tsc: ok
- vite build: ok
- Auditoria migration: sem `EXCEPTION WHEN OTHERS` no loop; nível A; relatório jsonb

## 6. Segurança

- `staff_can_import_catalog` (admin/gerente)
- Apply só com `import_id`
- authenticated execute; revoke public

## 7. Idempotência

- Nível A: reapply mesmo id → erro
- Nível B: novo import mesmo arquivo → already_covered / existing (protocolo operacional; smoke UI no ambiente)

## 8. Limitações / próximos

- Export CSV erros/revisões
- Histórico/perfis HF
- CRUD admin PVC years na ficha produto
- Smoke E2E com arquivo HF real no painel
- F/G continuam STOP

## 9. Arquivos principais

- `fal-pecas/src/services/import/applicationImportCore.ts`
- `fal-pecas/src/services/import/applicationImportCore.test.ts`
- `fal-pecas/src/services/import/applicationsImportApplyAudit.test.ts`
- `fal-pecas/src/services/admin/adminApplicationsImportService.ts`
- `fal-pecas/src/pages/admin/products/AdminApplicationsImportPage.tsx`
- `fal-pecas/supabase/migrations/20261007140000_apply_catalog_applications_import.sql`
- `docs/planejamento/ESPECIFICACAO_IMPORTACAO_INTELIGENTE_APLICACOES_2026-10-07.md`
- este relatório

## STOP

Sem commit/push até autorização explícita.
