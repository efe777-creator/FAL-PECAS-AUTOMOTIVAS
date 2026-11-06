# VAL — MARCHA O0-D residual · ConfirmDialog no admin

**Data:** 2026-11-06  
**Auth:** eFe — `MARCHA`  
**Plano:** O0-D item 4 (substituir `window.confirm` / `prompt`)

---

## Escopo

- `askReason` opcional no `ConfirmDialog`
- Zero `window.confirm` / `window.prompt` em `fal-pecas/src/pages/admin/**`

**Fora desta MARCHA:** páginas da conta do cliente (`Account*`) — residual loja.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Admin produtos / pedidos / preços / fornecedores / categorias / operadores | **PASS** |
| 2 | `grep window.confirm|prompt` em `pages/admin` = 0 | **PASS** |
| 3 | `tsc --noEmit` | **PASS** |

---

## STOP

O0-D admin **fechado**. Residual: Account* (loja).  
Próximo: gates humanos · ou ConfirmDialog na conta do cliente.

**Assinatura:** VAL O0-D ConfirmDialog admin PASS 2026-11-06.
