# VAL — MARCHA O0-D residual · ConfirmDialog na conta do cliente

**Data:** 2026-11-06  
**Auth:** eFe — `MARCHA`

---

## Escopo

Substituir `window.confirm` / `prompt` em:
- `AccountProfilePage` (encerrar conta)
- `AccountOrderDetailPage` (cancelar / autorizar / solicitar cancelamento)
- `AccountVehiclesPage` / `AccountAddressesPage` (remover)

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Zero `window.confirm|prompt` em `pages/Account` | **PASS** |
| 2 | `tsc --noEmit` | **PASS** |

---

## STOP

O0-D **fechado** (admin + conta).  
Único `window.confirm` restante: fallback em `ConfirmDialog.tsx` se o Host não montar.

**Assinatura:** VAL O0-D ConfirmDialog conta PASS 2026-11-06.
