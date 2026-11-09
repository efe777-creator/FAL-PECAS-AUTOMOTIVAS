# VAL — MARCHA Pacote MVP-1 · Apps (002) + Busca (003)

**Data:** 2026-11-09  
**Auth:** eFe — `MARCHA` (fatia G1)  
**AJUSTE:** 002 · 003  
**Plano:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Deploy:** só no **fim do dia**

---

## Entregas

| Item | Resultado |
|------|-----------|
| `adminUpdateApplicationVehicleVersion` | PASS — update in-place; 23505 amigável |
| UI “Trocar veículo” em Aplicações admin | PASS — selects montadora/modelo/motor/versão |
| Validação `ye < ys` no form do produto | PASS — `AdminProductApplicationsSection` |
| SearchBar exibe `error` da busca | PASS — alerta + link catálogo |
| Empty-state catálogo com dicas de código/veículo | PASS |

## Arquivos

- `fal-pecas/src/services/admin/adminProductService.ts`
- `fal-pecas/src/services/admin/adminApplicationService.ts`
- `fal-pecas/src/pages/admin/products/AdminApplicationsPage.tsx`
- `fal-pecas/src/components/admin/AdminProductApplicationsSection.tsx`
- `fal-pecas/src/components/navigation/SearchBar.tsx`
- `fal-pecas/src/pages/Catalog/CatalogPage.tsx`

## Fora desta fatia (gate/dado)

- Ligar sinônimos (`synonym_expansion_enabled`) e popular `search_synonyms`
- Troca de veículo também no `AdminProductApplicationsSection` (só na listagem global por enquanto)
- Alterar ranking das RPCs de busca

## STOP / próximo

Próxima fatia MVP-1 sugerida: **016/017** (pagamento produção / smoke) ou **031** (estoque/separação).

**Assinatura:** VAL MVP-1 apps/busca PASS · 2026-11-09.
