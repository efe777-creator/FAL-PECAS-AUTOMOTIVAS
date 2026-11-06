# VAL — MARCHA O0-C residual · copy admin

**Data:** 2026-11-06  
**Auth:** eFe — `MARCHA`  
**Plano:** O0-C jargão técnico

---

## Escopo

Remover do **texto renderizado** no admin: `D-FRETE`, `D-LIBERAR`, `ship_order`, `list_extra_cost`, `sandbox`, “Política M8”, “Onda 2”.

Código/API (`mode: 'sandbox'`) e filtros defensivos no checkout **fora** — não são copy de UI.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | ME / origem / placeholder / expedição sem D-FRETE/sandbox/ship_order | **PASS** |
| 2 | Produtos liberação sem D-LIBERAR | **PASS** |
| 3 | Preços / import custo sem `list_extra_cost` no rótulo | **PASS** |
| 4 | Pedidos: M8 / Onda 2 fora do texto | **PASS** |
| 5 | `tsc --noEmit` | **PASS** |

---

## STOP

O0-C residual admin **fechado**.  
Próximo: gates humanos (Netlify créditos / D-FRETE C / ME etiqueta / ligar pagamento) · M10 adiar.

**Assinatura:** VAL O0-C copy admin residual PASS 2026-11-06.
