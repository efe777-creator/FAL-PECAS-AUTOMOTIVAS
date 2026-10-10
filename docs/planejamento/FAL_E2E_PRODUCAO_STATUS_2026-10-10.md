# E2E compra + produção — status

**Data:** 2026-10-10 (MARCHA E2E-pré)  
**VAL pré-pagamento:** [FAL_MARCHA_E2E_PRE_PAGAMENTO_VAL_2026-10-10.md](./FAL_MARCHA_E2E_PRE_PAGAMENTO_VAL_2026-10-10.md)

---

## E2E (catálogo → pedido → pagamento)

| Etapa | Estado |
|-------|--------|
| Catálogo / PDP / carrinho (código) | Presente |
| Checkout + place_order F9-F | Código + RPC atualizados |
| Catálogo → PDP → carrinho (produção) | **OK** — [VAL E2E-pré](./FAL_MARCHA_E2E_PRE_PAGAMENTO_VAL_2026-10-10.md) |
| Checkout anônimo | **OK** — redireciona login |
| Bundle MP + aviso D-FRETE no checkout | **OK** (asset público) |
| Pagamento sandbox Pix/cartão | **BLOQUEADO** — UI produção = **simulado** (H5 FAIL; ver MP status) |
| Frete política produção | **BLOQUEADO** (D-FRETE assinatura) |
| Pedido teste ponta a ponta com evidências | **NÃO EXECUTADO** |

Pré-requisitos para marcar E2E PASS completo: smoke MP + D-FRETE (A/B/C) + pedido teste registrado.

---

## Produção (Netlify)

| Check | Estado | Evidência 10/10 |
|-------|--------|-----------------|
| Site público responde | **OK** | https://fal-pecas-automotivas.netlify.app |
| Catálogo carrega produtos | **OK** | cards + CTAs |
| `VITE_SUPABASE_*` → wtbp | **OK** | Network `wtbpwuiayednvlhvuhbh.supabase.co` |
| Checkout embute MercadoPago | **OK** | `CheckoutPage-*.js` · `create-mp-payment` |
| `VITE_PAYMENT_PROVIDER` / `VITE_MP_PUBLIC_KEY` valores | **NÃO VERIFICADO** (painel Netlify no H5) | — |
| Deploy sync `main` → CDN | **ATRASADO** 10/10 noite | Bundle `index-oy7VRadL.js` sem “Ver produto” (PRs #33–#35 no git) — **S0** do [plano soberano](./FAL_PLANO_FINALIZACAO_ALPHA_SOBERANO_2026-10-10.md) |

---

## Encerramento

**Entrega agente:** E2E-pré VALIDADO até login.  
**Aceite E2E comercial:** evidências humanas Pix/cartão + pedido (S4).  
**Ops:** Trigger deploy Netlify antes de smokes UI (S0).
