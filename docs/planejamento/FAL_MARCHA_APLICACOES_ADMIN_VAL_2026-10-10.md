# MARCHA — Admin Aplicações (gestão global)

**Data:** 2026-10-10  
**Estado:** IMPLEMENTADO (código)  
**Rota:** `/admin/aplicacoes`

---

## Escopo

Tela fora do cadastro individual do produto para controlar aplicações (`product_vehicle_compatibility`), inclusive as trazidas pela importação.

| Ação | Status |
|------|--------|
| Listar + filtrar (SKU, montadora, modelo, motor, versão) | OK |
| Criar (SKU + cascata + período; motor/versão vazios = todas) | OK |
| Editar período | OK |
| Excluir uma / seleção | OK |
| Link importação ↔ gestão | OK |
| Link produto → gestão (`?productId=`) | OK |

---

## Arquivos

- `fal-pecas/src/services/admin/adminApplicationService.ts`
- `fal-pecas/src/pages/admin/products/AdminApplicationsPage.tsx`
- Rota + nav: `router.tsx`, `AdminLayout.tsx`

---

## Smoke residual

- Abrir `/admin/aplicacoes` após import e confirmar linhas editáveis/excluíveis.
- Criar manual com SKU existente e motorização “Todas”.
