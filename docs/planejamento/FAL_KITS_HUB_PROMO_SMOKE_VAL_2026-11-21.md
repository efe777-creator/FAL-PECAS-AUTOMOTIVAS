# VAL — Hub Kits + Promo itens/kits + smoke cliente (completo)

**Data:** 2026-11-21 · **Branch:** `dev`  
**Ambiente:** localhost:5173 · Supabase `wtbpwuiayednvlhvuhbh`  
**Smoke kit:** `FAL-SMOKE-KIT-01` · slug `kit-smoke-direcao` · id `b2222222-2222-2222-2222-222222222201`

## Escopo validado

1. Hub admin Kits (`/admin/kits`) + Preços (`/admin/kits/precos`)
2. Promoções Itens + Kits (`/admin/home/promocoes`, `/admin/home/promocoes/kits`)
3. Catálogo cliente (PVC empty UX + card promo)
4. PDP kit smoke (composição + preço oferta)
5. Typecheck + testes unitários de nav/release

## Testes automatizados

| Suite | Resultado |
|-------|-----------|
| `adminNavConfig` + `adminNavAccess` + `adminBreadcrumbs` + `releaseChecklist` | **4 files · 25 tests PASS** |
| `tsc --noEmit -p tsconfig.app.json` | **PASS** (após correções residuais) |

## Correções aplicadas neste ciclo

| Item | Arquivo | Nota |
|------|---------|------|
| Catálogo “1 produto” com grid vazio (PVC `hide`) | `CatalogPage.tsx` | `allHitsHiddenByFit` + EmptyState + CTA **Limpar veículo** |
| Lista promo só 1 gate vs itens da lista | `adminProductPromotionService.ts` + `AdminPromotionsPage.tsx` | Lista vem de `price_list_items`; scroll `max-h-[min(28rem,55vh)]`; aba Kits |
| `}` faltando (syntax) | `VehicleVisualizationEngine.tsx` | Residual — quebrava `tsc` |
| Import kit composition (CSV/XLSX args) | `adminKitCompositionImportService.ts` | Alinhado ao padrão dos outros imports |
| `productHref` com `sku` inválido | `kitCompositionStoreService.ts` | Removido campo não tipado |
| Import não usado | `AdminProductKitSection.tsx` | Removido `adminSyncKitListPrices` |

## Smoke browser — operador

| Passo | Esperado | Status |
|-------|----------|--------|
| `/admin/kits` | Título Kits · Novo kit · Preços · Status · smoke listado | **PASS** |
| `/admin/kits/precos` | Smoke · Automático · Soma R$ 249,43 · Base loja · Mudar para manual | **PASS** |
| `/admin/home/promocoes` | Itens **(98)** · Incluir e ativar · lista com rolagem · 98 exibidos · 1 ativa | **PASS** |
| `/admin/home/promocoes/kits` | Kits **(1)** · FAL-SMOKE-KIT-01 · Ativa · R$ 249,43 → **R$ 199,90** | **PASS** |
| `/admin/promocoes` (path antigo) | 404 admin (rota canônica é `/admin/home/promocoes`) | **PASS** (esperado) |

## Smoke browser — cliente

| Passo | Esperado | Status |
|-------|----------|--------|
| Catálogo com fit HB20 + kit hide PVC | EmptyState claro + **Limpar veículo** (não “1 produto” vazio) | **PASS** (ciclo anterior) |
| Catálogo `?q=FAL-SMOKE-KIT-01` | Card **Kit Smoke Direção** · Oferta **R$ 199,90** · riscado **R$ 249,43** | **PASS** |
| PDP `/produto/kit-smoke-direcao` | Badge Kit · ESTE KIT INCLUI (TDI0127 / PVI0127 / BRD2404) · Oferta −20% · 199,90 / 249,43 · economia R$ 49,53 · Adicionar | **PASS** |

## Preço (resolução)

| Contexto | Valor |
|----------|-------|
| Soma itens avulsos | R$ 249,43 |
| Promo ativa (lista promocional) | R$ 199,90 |
| Economia no kit | R$ 49,53 |

## Observações

- Promo de kit é preço próprio do SKU do kit (não herda desconto dos itens) — copy e comportamento confirmados na aba Kits.
- Lista `preco-kits-manual` permanece operacional de preços auto/manual; **não** entra no seletor de campanha promocional.
- Busca textual por `FAL-SMOKE-KIT-01` ainda traz outros “kits” (fuzzy/nome); o smoke aparece corretamente no resultado com preço promo.
- Commit **não** criado (só sob pedido). Trabalho consolidado na `dev`.

**Assinatura:** VAL hub kits + promo itens/kits + PDP smoke · 2026-11-21
