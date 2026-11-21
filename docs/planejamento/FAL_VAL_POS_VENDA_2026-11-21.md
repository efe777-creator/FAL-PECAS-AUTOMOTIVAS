# FAL — VAL pós-venda (camada pedido)

**Data:** 2026-11-21  
**Branch:** `dev`  
**Commits:** `1c28e45` (F1) → `ccc92a4` (F2) → `0334ea2` (F3) → `3959967` (fechamento) → `eb7d280` (WA D18) → marcha status caso + chips stage

## Escopo

Validação da Spec D1–D18 sem deploy Netlify produção.  
E2E Melhor Envio com código real de devolução exige pedido ME + secrets produção — **ainda pendente humano**.

## Evidência automatizada (2026-11-21)

| Check | Resultado |
|-------|-----------|
| Vitest pós-venda (window, motives, chips, occurrences, eligibility, lifecycle, antiregress) | PASS |
| RPCs remotas: `customer_report_delivery_issue`, `admin_list_revisao_queue_rows`, `admin_post_sale_case_action`, `attach_me_return_code` | PRESENT (`wtbpwuiayednvlhvuhbh`) |
| Edge `melhorenvio-reverse` | ACTIVE v1 |
| Sem `orders.status = 'devolucao'` em migrations | PASS (grep) |
| Sem rota `/admin/pos-venda` | PASS |
| Webhook ME tracking-only (sem `deliver_order`) | PASS |
| Ida ME com `reverse: false`; reversa em Edge separada | PASS |
| Legal `/trocas-devolucoes` via `returnPolicyCopy` (versão `2026-11-21-f3`) | PASS |

## Checklist anti-erro (plano)

- [x] Confirm receipt ≠ T0 da janela (T0 = `delivered_at` FAL)
- [x] Caso aberto não expira só por calendário (`hasOpenPostSaleCase`)
- [x] Sem auto-`deliver_order`
- [x] Sem gerar código ME na abertura do caso (só após `autorizada` + CTA)
- [x] Sem `/admin/pos-venda` ou módulo isolado
- [x] Visão `problemas` ≠ RMA (`revisao-logistica` + chips)
- [x] Copy legal via `returnPolicyCopy`
- [x] Edge reversa separada da ida

## Smoke dry-run (2026-11-21 — `scripts/smoke-me-reverse.mjs`)

| Passo | Resultado |
|-------|-----------|
| Seed ME `entregue` + packing 1 vol + `cart_item_id` | OK |
| Seed own fallback | OK (`1035cc77…`) |
| open → start → authorize `me_codigo` + override PAC | OK |
| Edge `generate` com `forceDryRun` (staff) | **PASS** `DRY-REV-12DC7B28` |
| Evento customer com `me_reverse.tracking_code` | **PASS** |
| Pedido smoke | `12dc7b28-d7e8-4fd5-9210-931d793185e0` |
| Revalidação pós-deploy `liveReady` (2026-11-21 noite) | **PASS** `4a47e196…` · `liveReady:false` + `me_order_id_synthetic` · `DRY-REV-4A47E196` |

## VAL manual restante (produção ME real)

Pré-check: Edge `action:status` → `liveReady:true` só com token ME + elegível + stage + não sandbox + `cart_item_id` **numérico ME** (UUID = sintético → `me_order_id_synthetic`). Smoke espera `liveReady:false` + `forceDryRun`.

1. Pedido com etiqueta ME **real** (`cart_item_id` válido) → `status.liveReady` → generate **sem** `forceDryRun`.  
2. UI conta: cliente clica Gerar código (sem flag staff).  
3. Conferência ok → Repor estoque + Marcar estorno.  
4. Frete próprio: ops só vê WA/loja na UI (elegibilidade).  
5. Timeline conta: labels de stage (autorizada / código / resolvido).

## Hotfix (2026-11-21)

`admin_occurrence_action` no remoto só tinha overload de **8** args; o client admin enviava **13** → `PGRST202` ao abrir ocorrência no OrderOps.  
Migration `20261121193000_admin_occurrence_action_full_overload.sql` aplicada; smoke revalidado **PASS** (`DRY-REV-FE6C448E`).

## D18 WhatsApp (2026-11-21)

| Intent / período | UI | Resultado |
|------------------|----|-----------|
| Caso aberto | HelpPanel + rodapé | mensagem com pedido + caso |
| Fora prazo 7d | HelpPanel | intent `fora_prazo` |
| Modo `wa` / `loja` / `me_codigo` | AuthorizedPanel | intents tipados + código se houver |
| Normalize `VITE_WHATSAPP_PHONE` | `whatsapp.ts` | E.164 `55…` |
| Vitest `whatsapp.test.ts` | 9/9 | PASS |

## Gate F3 → done

**PASS** código + smoke dry-run ponta a ponta (stages → código → evento) + WA D18.  
**HOLD** só para generate ME live com order_id real da ida.
