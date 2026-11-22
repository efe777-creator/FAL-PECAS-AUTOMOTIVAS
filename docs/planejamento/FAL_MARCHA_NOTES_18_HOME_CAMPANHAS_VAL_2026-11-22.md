# VAL — Notes #18 Home / campanhas → catálogo filtrado

**Branch:** `dev` · **Sem MAIN**  
**PDF:** Notes_211136 · item #18

## Correção

1. Admin campanha: destino CTA estruturado (catálogo / categoria / produtos / veículo / manual) → grava em `to`/`href`.
2. `buildCampaignCatalogHref` → `/catalogo?cat|ids|maker|model|year&vehicle=1` (sem migration).
3. Catálogo: `?ids=` carrega seleção curada via `listPublishedProductsByIds`.

## Pós

- Vitest alvo: **12/12** (`homeCampaignLink`, `productWidgets`, `productDescription`)
- `tsc --noEmit` OK
- REF atualizado · trilho widget `campaign` permanece planned · próximo Notes: #10 (copy)
