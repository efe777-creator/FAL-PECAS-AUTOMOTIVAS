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

- `HOME_BANNER_IMAGE_IDEAL` = **1376 × 768** (upload **rejeita** fora); mobile opcional **768 × 432**; preview admin `aspect-[1376/768]`; frame Home **`w-full` + `h-[min(vh,…)]`** (full-bleed; arte 16:9 via `object-cover`).

## Evidência

- Vitest: `catalogHref`, `homeCampaignLink`, `productDescription`, `garageVehicleUi`, `productWidgets`
- `tsc --noEmit` OK
- Mapa §3.4 atualizado
