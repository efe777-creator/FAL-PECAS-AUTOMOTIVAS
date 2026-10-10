# E2E compra + produção — status

**Data:** 2026-10-10 (revalidação agente — pós PR #21/#22)

---

## E2E (catálogo → pedido → pagamento)

| Etapa | Estado |
|-------|--------|
| Catálogo / PDP / carrinho (código) | Presente |
| Checkout + place_order F9-F | Código + RPC atualizados |
| Catálogo público + add-to-cart | **OK** (smoke 10/10 — ver produção) |
| Pagamento sandbox Pix/cartão | **BLOQUEADO** (smoke MP humano H1–H6) |
| Frete política produção | **BLOQUEADO** (D-FRETE assinatura) |
| Pedido teste ponta a ponta com evidências | **NÃO EXECUTADO** |

Pré-requisitos para marcar E2E PASS: smoke MP + D-FRETE (A/B/C) + pedido teste registrado.

---

## Produção (Netlify)

| Check | Estado | Evidência 10/10 |
|-------|--------|-----------------|
| Site público responde | **OK** | https://fal-pecas-automotivas.netlify.app |
| Catálogo carrega produtos | **OK** | `/catalogo` — 24 cards observados |
| `VITE_SUPABASE_*` → wtbp | **OK** | Network: `wtbpwuiayednvlhvuhbh.supabase.co` (REST + `search_products`) |
| Deploy recente (Card UX / emoji client) | **OK (RELATO)** | Assets `ProductCard-*.js` + query `emoji` em categories; tip git `main` = `84dad02` |
| `VITE_PAYMENT_PROVIDER` / `VITE_MP_PUBLIC_KEY` | **NÃO VERIFICADO** (sem secrets; conferir no painel Netlify no smoke H5) | — |

---

## Encerramento deste todo (plano)

**Entrega do agente:** checklist + verificação Netlify/catálogo; E2E pagamento permanece bloqueado.  
**Aceite E2E comercial:** evidências humanas Pix/cartão + pedido.
