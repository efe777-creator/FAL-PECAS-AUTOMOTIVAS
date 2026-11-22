# VAL — Campanha destino composto + higiene caminhos + arte 1376×768

**Branch:** `dev` · **Sem MAIN**  
**Projeto DB:** wtbp (`search_products_multi_cat_model`)

## Gate 0 — writers `/catalogo`

| Writer | Antes | Depois |
|--------|-------|--------|
| Campanha | YMM copiado | `homeCampaignLink` → `catalogHref` |
| PDP browse | YMM copiado | `buildCatalogBrowseHref` → `catalogHref` |
| Placa/seletor | `buildVehicleQuery` local | `appendCatalogVehicleParams` |
| Home / quick pick / garagem | sem `vehicle=1` | `buildCatalogHref` |

Regra: **`ids` XOR filtro vivo** no `to` da campanha.

## Destino composto

- Admin: picker produtos; checkboxes cats; maker + multi-model; **Testar destino**.
- URL: `cat=a,b` ∪ `model=Onix,Prisma,Cobalt` ∩ maker via RPC.
- RPC wtbp apply: CSV multi-cat / multi-model (até 12).

## Arte

- `HOME_BANNER_IMAGE_IDEAL` = **1376 × 768**; preview admin + frame Home `aspect-[1376/768]`.

## Evidência

- Vitest: `catalogHref`, `homeCampaignLink`, `productDescription`, `garageVehicleUi`, `productWidgets`
- `tsc --noEmit` OK
- Mapa §3.4 atualizado
