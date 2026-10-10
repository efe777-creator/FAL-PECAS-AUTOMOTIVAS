# MARCHA — Admin Listas de preço (UX edição)

**Data:** 2026-10-10  
**Estado:** VALIDADO (unit + DB %; smoke staff residual)  
**Rotas:** `/admin/precos` · detalhe da lista  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Escopo

Residual ops do plano α: UX de edição na lista (não bloqueia 1ª venda).

| Critério | Status |
|----------|--------|
| Painel ajuste rápido (`PriceListQuickAdjustPanel`) na overview | OK |
| Modal item: aplicar regra / editar % / preço manual | OK |
| Hints de camadas (lista ≠ item ≠ disponibilidade) | OK |
| Classificação apontando Cat/Grupo/Sub | OK |
| `list_extra_cost_percent` no wtbp + save no service | OK |
| Copy UI sem “aguarda migration” quando coluna existe | OK (10/10) |

---

## Arquivos

- `AdminPriceListsPage.tsx` · `AdminPriceListDetailPage.tsx`
- `PriceListQuickAdjustPanel.tsx` · `PriceItemPricingModal.tsx`
- `adminPriceListService.ts` · `priceLabels.ts`

---

## Evidências

| Tipo | Resultado |
|------|-----------|
| Unit filtros/overview/sync/sem preço | **14/14 PASS** |
| DB | `price_lists.list_extra_cost` + `list_extra_cost_percent` presentes |
| Smoke staff | Residual: gravar % e editar item na lista Base |

---

## Fora de escopo

- Smoke MP / E2E pago  
- Import de lista de preços (já coberto em outras VALs)  
- Bloco F  

---

## Smoke residual (humano staff)

```text
1. /admin/precos — selecionar lista no ajuste rápido
2. Editar item: três modos do modal
3. Formação: gravar adicional % e conferir persistência
4. Confirmar hint: Lista ativa ≠ item com preço ≠ loja
```
