# E2E compra + produção — status

**Data:** 2026-10-10

---

## E2E (catálogo → pedido → pagamento)

| Etapa | Estado |
|-------|--------|
| Catálogo / PDP / carrinho (código) | Presente |
| Checkout + place_order F9-F | Código + RPC atualizados |
| Pagamento sandbox Pix/cartão | **BLOQUEADO** (smoke MP humano) |
| Frete política produção | **BLOQUEADO** (D-FRETE) |
| Pedido teste ponta a ponta com evidências | **NÃO EXECUTADO** |

Pré-requisitos para marcar E2E PASS: smoke MP + D-FRETE (ou cenário A/B explícito) + pedido teste registrado.

---

## Produção (Netlify)

| Check | Estado |
|-------|--------|
| Deploy = commit esperado (ex. pós PR #20) | **NÃO VERIFICADO** nesta marcha |
| `VITE_SUPABASE_*` → wtbp | **NÃO VERIFICADO** |
| `VITE_PAYMENT_PROVIDER` / `VITE_MP_PUBLIC_KEY` | **NÃO VERIFICADO** |
| PDP/catálogo na URL pública | **NÃO VERIFICADO** |

---

## Encerramento deste todo (plano)

**Entrega do agente:** checklist + bloqueios explícitos; suite unitária local executada à parte.  
**Aceite E2E/produção:** evidências humanas / CI deploy.
