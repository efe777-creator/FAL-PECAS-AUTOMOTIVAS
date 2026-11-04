# VAL — MARCHA_PRODUTOS_ALTERACOES_GLOBAIS

**Data:** 2026-11-04  
**Auth:** MARCHA (M0 pós-relatório · pós-α)  
**Plano funcional:** [FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md)  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**D-FRETE:** **B** (inalterado)

---

## Escopo

Listagem `/admin/produtos`: filtros Categoria → Grupo → Subgrupo + Situação; painel **Alterações globais** seccionado (Situação / Classificação / Medidas).  
**Fora:** histórico de medidas; filtros logísticos por peso/dims; padrões de categoria apply; Melhor Envio; fabricante/fornecedor em massa.

---

## Entrega (FATO)

| Item | Estado |
|------|--------|
| `CategoryCascadeSelects` reutilizável | OK |
| Filtros cascata + Situação (`is_available`) + `adminListProducts.available` | OK |
| Painel Alterações globais sempre visível; disabled sem seleção | OK |
| Situação: Liberar / Publicar / Arquivar / disponível / indisponível | OK |
| Classificação em massa `adminBulkSetProductCategory` | OK |
| Medidas: `skip_manual` / `overwrite_manual` (já VAL’do) no painel | OK |
| Coluna Situação na tabela | OK |
| `tsc --noEmit` | PASS |
| Smoke UI local `/admin/produtos` | PASS (cascata + seções + microcopy) |

### Arquivos

- `fal-pecas/src/components/admin/CategoryCascadeSelects.tsx`
- `fal-pecas/src/pages/admin/products/AdminProductsPage.tsx`
- `fal-pecas/src/services/admin/adminProductService.ts`

Sem migration nova (só UPDATE em colunas existentes).

---

## Aceite

1. Filtro categoria restringe grupo; grupo restringe subgrupo.  
2. Situação Disponível/Indisponível filtra a lista.  
3. Sem seleção: seções visíveis, botões disabled.  
4. Com seleção: disponibilidade, classificação e medidas aplicam só aos IDs.  
5. Deploy `main` / Netlify com tip desta MARCHA (após PR).

---

## Deploy

| Gate | Resultado |
|------|-----------|
| PR #46 → `main` | **PASS** · `290f752` |
| Netlify | **PASS** · published `2026-11-04T15:46:22Z` · bundle `index-DBB7LuFQ.js` |
| Smoke prod `/admin/produtos` | **PASS** · Alterações globais + cascata + Situação |

---

## Follow-ups

- `MARCHA_PEDIDO_EXPIRY_RESERVA`  
- `MARCHA_LOGISTICA_FILTROS_HISTORICO_MEDIDAS`  
- `MARCHA_PEDIDOS_OPS_CONFIRMACAO_SEPARACAO`  

**Resultado:** **PASS** (código + smoke local + deploy prod).

**Assinatura agente:** VAL alterações globais produtos 2026-11-04.
