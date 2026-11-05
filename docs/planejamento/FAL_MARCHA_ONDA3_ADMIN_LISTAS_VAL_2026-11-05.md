# VAL — MARCHA Onda 3 · Listas admin (Destaques + Produtos)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`

---

## Escopo

1. **Home → Destaques:** lista em tabela (código, nome, categoria, status, Home) + busca na fila + filtro ligado/off + incluir do catálogo.  
2. **Produtos:** filtros compactos em `<form>` (Enter busca), labels Status≠Estoque, links secundários no header, lote só com seleção, link para Home/Destaques.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Destaques em tabela filtrável/buscável | **PASS** |
| 2 | Produtos: barra única compacta + cascata | **PASS** |
| 3 | Lote oculto sem seleção (anti-ruído) | **PASS** |
| 4 | Sem reload automático só em “Sem imagem” | **PASS** (tudo via Buscar) |
| 5 | `tsc --noEmit` | **PASS** |

---

## STOP

Próximo: condições de pagamento (11/12) = gate eFe · ou Onda 4.

**Assinatura:** VAL Onda 3 admin listas PASS 2026-11-05.
