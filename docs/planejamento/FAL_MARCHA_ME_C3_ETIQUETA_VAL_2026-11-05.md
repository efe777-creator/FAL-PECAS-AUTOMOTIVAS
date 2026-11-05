# VAL — MARCHA ME-C3 etiqueta Expedição (preparação)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Plano:** [FAL_PLANO_CORRECOES_MELHOR_ENVIO_2026-11-05.md](./FAL_PLANO_CORRECOES_MELHOR_ENVIO_2026-11-05.md) · ME-C3

---

## Escopo

Deixar pedido âncora ME em `pronto_para_envio` pronto para o ciclo Expedição (`quote`→`prepare`→`purchase`→`generate`→`print`) e pré-preencher transportadora/rastreio a partir do metadata ME.

**Fora desta MARCHA:** compra real de etiqueta (staff + `confirm:true` + saldo ME) — gate humano D10.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Edge `melhorenvio-label` lê origem em `store_shipping_origin` (não CEP hardcoded) | **PASS** (código) |
| 2 | Origem ativa Guarulhos `07124543` | **PASS** |
| 3 | Serviços ME enabled (PAC/SEDEX/.Package) | **PASS** |
| 4 | Pedido smoke `pronto_para_envio` + shipment `melhorenvio` | **PASS** — `f6c08149-d981-46a7-9917-8d001980d2ce` · `payment_ref=SMOKE-ME-C3-20261105` · `label_state=none` |
| 5 | Item + painel Expedição elegível no admin | **PASS** (seed) |
| 6 | Pré-fill carrier/service/tracking no detalhe do pedido | **PASS** (código) |
| 7 | E2E `purchase`→`print` na UI | **GATE humano** — Admin → pedido smoke → Cotar → Preparar → Comprar → Gerar → Imprimir |

---

## Como fechar o gate (operador)

1. Abrir `/admin/pedidos/f6c08149-d981-46a7-9917-8d001980d2ce` (ou buscar `SMOKE-ME-C3`).  
2. Em **Expedição**: Cotar etiqueta → Preparar carrinho → **Comprar etiqueta** (confirma).  
3. Gerar → Imprimir (URL/PDF).  
4. Opcional: Registrar entrega à transportadora (`ship_order`) — separado da etiqueta.  
5. Atualizar este VAL: critério 7 → PASS + protocol/tracking.

---

## STOP

Seed + readiness **FEITO**. Purchase/print = **assinatura humana** (custo ME / D10).  
Próximo ME após print: ME-C6 registrar API_BASE · Onda 2 busca/SEO.

**Assinatura:** VAL ME-C3 preparação PASS 2026-11-05 · E2E print gate.
