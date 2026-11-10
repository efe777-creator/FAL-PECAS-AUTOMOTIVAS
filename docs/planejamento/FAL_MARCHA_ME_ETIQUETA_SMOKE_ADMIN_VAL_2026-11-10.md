# VAL — Etiqueta ME + smoke admin (eFe)

**Data:** 2026-11-10  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh` · loja https://fal-pecas-automotivas-efe.netlify.app  
**Pedido âncora:** `6eb61dd5-977f-4050-9bc3-4d7e56b254ed` · `payment_ref=SMOKE-ME-LABEL-20261110`

---

## Escopo

1. Ciclo Expedição `melhorenvio-label`: `status` → `quote` → `prepare` (carrinho).  
2. Smoke admin staff (`is_staff` + `admin_order_status_counts` + leitura do pedido).  
3. **Não** comprar etiqueta em ME **live** automaticamente (custo real).

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Seed pedido `pronto_para_envio` + shipment `melhorenvio` | **PASS** |
| 2 | Edge `quote` OK (API ME produção) | **PASS** — `sandbox=false` · mensagem produção |
| 3 | Edge `prepare` → `label_state=cart` + `cart_item_id` | **PASS** após fix docs CPF/CNPJ |
| 4 | Fix: CNPJ origem inválido / CPF from≠to / volumes não zerados no quote | **PASS** (deploy `melhorenvio-label`) |
| 5 | `purchase` automático | **GATE** — ME **live**; só operador com `confirm:true` + saldo |
| 6 | Smoke admin API: `is_staff`, counts, pedido âncora | **PASS** — `pronto_para_envio:1` |
| 7 | UI admin Expedição (login browser eFe) | **PARCIAL** — redirect auth Supabase ainda aponta `localhost:3000`; usar login manual staff |

---

## Evidência prepare (antes → depois)

- Antes: `cart_http_422` CNPJ inválido / CPF remetente=destinatário.  
- Depois: `Carrinho Melhor Envio preparado.` · `label_state=cart`.

---

## Como fechar purchase/print (humano)

1. Login staff em `/admin` (eFe).  
2. Abrir pedido `6eb61dd5-…` → Expedição.  
3. **Comprar etiqueta** (confirma) → Gerar → Imprimir.  
4. Opcional: `ship_order` (postagem ≠ etiqueta).  
5. Atualizar critério 5 → PASS + protocol.

**Ops:** cadastrar CNPJ real válido em `store_shipping_origin.document` (hoje placeholder).

---

## Assinatura

VAL ME etiqueta prepare + smoke admin API PASS · purchase live GATE · 2026-11-10.
