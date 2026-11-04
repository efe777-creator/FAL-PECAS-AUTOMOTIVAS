# E2E compra + produção — status

**Data:** 2026-10-10 (MARCHA E2E-pré) · **sync docs:** 2026-11-04  
**VAL pré-pagamento:** [FAL_MARCHA_E2E_PRE_PAGAMENTO_VAL_2026-10-10.md](./FAL_MARCHA_E2E_PRE_PAGAMENTO_VAL_2026-10-10.md)  
**Planejamento α:** [FAL_PLANEJAMENTO_PROXIMOS_PASSOS_ALPHA_2026-11-04.md](./FAL_PLANEJAMENTO_PROXIMOS_PASSOS_ALPHA_2026-11-04.md)

---

## E2E (catálogo → pedido → pagamento)

| Etapa | Estado |
|-------|--------|
| Catálogo / PDP / carrinho (código) | Presente |
| Checkout + place_order F9-F | Código + RPC atualizados |
| Catálogo → PDP → carrinho (produção) | **OK** — [VAL E2E-pré](./FAL_MARCHA_E2E_PRE_PAGAMENTO_VAL_2026-10-10.md) · reconfirmado browser 04/11 (100 produtos) |
| Checkout anônimo | **OK** — redireciona login |
| Bundle MP + aviso D-FRETE no checkout | **OK** (asset público; H5 config PASS 14/10) |
| Pagamento sandbox Pix/cartão | **NÃO EXECUTADO** (smoke comercial pendente — H1–H5 ≠ smoke) |
| Frete política produção | **PENDENTE** assinatura D-FRETE (premissa plano α = B) |
| Pedido teste ponta a ponta com evidências | **NÃO EXECUTADO** |

Pré-requisitos para marcar E2E PASS completo: smoke MP + D-FRETE assinado + pedido teste registrado (S4).

---

## Produção (Netlify)

| Check | Estado | Evidência |
|-------|--------|-----------|
| Site público responde | **OK** | https://fal-pecas-automotivas.netlify.app |
| Catálogo carrega produtos | **OK** | 04/11: 100 produtos · mostrando 24 |
| `VITE_SUPABASE_*` → wtbp | **OK** | DNS/UP `wtbpwuiayednvlhvuhbh` 04/11 |
| Checkout embute MercadoPago | **OK** (build) | H5 PASS — [H1H6](./FAL_MP_SMOKE_H1H6_CHECK_2026-10-14.md); bundle `index-DYpbbWUS.js` |
| Smoke Pix/cartão em prod | **NÃO EXECUTADO** | — |
| Deploy sync `main` → CDN (S0) | **PASS** 04/11 | [Auditoria status](./FAL_AUDITORIA_STATUS_PRD_CROSS_2026-11-04.md) |

**Histórico:** em 10/10 noite o bundle esteve stale (`oy7VRadL`); corrigido 11/10+; reconfirmado 04/11.

---

## Encerramento

**Entrega agente:** E2E-pré VALIDADO até login.  
**Aceite E2E comercial:** evidências humanas Pix/cartão + pedido (S4) — ainda pendente.  
**Ops:** S0 **PASS** 2026-11-04.
