# FAL — VAL · PDP duplicidades / hierarquia de textos

**Data:** 2026-11-20  
**Branch:** `dev`  
**Escopo:** caminhos, botões e textos da PDP (buy-box + acordeão apps + modal verify). Sem redesign; PVC/compat/cart intactos.

## 1. Matriz encontrada → ação

| # | Sintoma | Onde | Decisão | Status |
|---|---------|------|---------|--------|
| D1 | `Marca: X` + `Fabricante: X` | badge + linha ref | Badge = marca; linha só **Referência** | Corrigido |
| D2 | “não altera garagem/header” 4–5× | emptyHint, microcopy botão, modal verify, subtitle manual, form completar | Disclaimer **1×** no modal verify + **1×** no modal completar (mobile) | Corrigido |
| D3 | emptyHint + microcopy sob botão | buy-box sem veículo | emptyHint curto; microcopy removida | Corrigido |
| D4 | `Alterar veículo` (buy-box) + `Trocar` (acordeão) → `/garagem` | veredito + apps | Trocar/veículo **só** buy-box; acordeão sem eco | Corrigido |
| D5 | `Verificar compatibilidade` vs `Verificar` | CTA primário vs refinar ano/motor | Hierarquia OK (primário vs secundário) | Mantido |
| D6 | Header `Confirmar compatibilidade` vs PDP `Verificar…` | chip garagem vs local PDP | Intenções distintas (garagem ≠ local) | Mantido |
| D7 | `AJUDA_APLICACAO_TEXT` vs CTA verify | acordeão apps | Ajuda discreta ≠ CTA; OK | Mantido |
| D8 | `Filtrar no catálogo` vs `Ver mais no catálogo` | apps vs related | Destinos distintos | Mantido |

## 2. Hierarquia alvo (pós-marcha)

1. **Identidade:** `Marca` (badge) → título → `Referência`  
2. **Compat:** veredito **só** buy-box → CTA `Verificar compatibilidade` **ou** Alterar/Trocar/Limpar  
3. **Disclaimer local:** só dentro do modal (placa|manual) / modal completar  
4. **Acordeão Aplicação:** apps PVC + atalho catálogo + ajuda — **sem** veículo/Trocar/veredito  
5. **Compra:** preço → pagamento → qty → frete → Add → Comprar

## 3. Arquivos

- `fal-pecas/src/pages/Product/ProductPage.tsx`
- `fal-pecas/src/components/vehicle/VehiclePlateSearch.tsx` (subtitle `localOnly`)
- `fal-pecas/src/services/compatibility/compatUiAntiregress.test.ts`
- `docs/planejamento/FAL_PDP_REDESIGN_SPEC_CONSOLIDADA_2026-11-20.md` (§3 veículo/veredito)

## 4. Gates

- [x] Antiregress M4/M6 atualizados  
- [x] `vitest` `compatUiAntiregress.test.ts` — 19/19 PASS  
- [x] Smoke `/produto/pvi1057`: ref sem Fabricante; emptyHint curto; sem microcopy sob botão; modal 1 disclaimer (`Só nesta página — não altera a Minha Garagem`)  

## 5. Fora de escopo

- Renomear chip header (`Confirmar…`)  
- Unificar `Filtrar` / `Ver mais` no catálogo  
- Cards related (Fabricante no card permanece — superfície distinta)
