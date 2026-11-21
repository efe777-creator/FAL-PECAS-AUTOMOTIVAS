# Auditoria pós-impl — Camada pós-venda

**Data:** 2026-11-21  
**Escopo:** código, relações, layout/UX, jornadas  
**Testes:** 22 unitários PASS (amostra pós-venda) + smoke dry-run prévio PASS

## Veredito

Camada **operacional** na `dev`, com P0 de jornada corrigidos nesta marcha.  
HOLD permanece: generate ME **live** com `cart_item_id` real.

## Achados e ação

| Pri | Achado | Ação |
|-----|--------|------|
| P0 | Painel cliente sumia após `aguardando_peca` (perdia código ME) | Corrigido — painel cobre stages pós-autorização |
| P0 | Janela 7d: RPC tratava qualquer `occurrence_opened` como aberto (eternizava) | Corrigido — aberto = último evento ≠ resolved |
| P0 | Casos paralelos no mesmo pedido | Corrigido — RPC bloqueia novo report se há aberto; UI sem CTA |
| P0 | Overload 8 vs 13 `admin_occurrence_action` | Já corrigido (`d3ed8b7`) |
| P1 | Status “Aberta” após authorize | Corrigido — `occurrence_updated`+stage → `in_progress` |
| P1 | Motivo/escopo tipados invisíveis no admin | Corrigido — `motivoCode`/`scope` no derive + painel |
| P1 | Dualidade `admin_occurrence_action` × `admin_post_sale_case_action` | Aceito — bifurcação por `isPostSaleTipo`; documentado |
| P2 | Visão `problemas` ≠ pós-venda | OK por desenho; risco de nome enganar ops |
| P2 | ACK legal truncado (5 bullets) | Aceito por agora; legal completa em `/trocas-devolucoes` |
| P2 | Mensagem “multi-volume” com volume 0 | Corrigido — `volume_unknown` |

## Jornadas validadas (automação)

1. Smoke: open → start → authorize → generate dry-run → evento `me_reverse` — **PASS**  
2. Unit: elegibilidade ME / own / multi-volume / stages derive — **PASS**  
3. Anti-regressão: sem `/admin/pos-venda`, Edge separada, legal=`returnPolicyCopy` — **PASS**

## Jornadas manuais recomendadas

1. Conta: 2º “Informar problema” com caso aberto → mensagem + RPC erro  
2. Ops: Autorizar → Aguardando peça → cliente ainda vê código/CTA  
3. Conferência sujo → recusa; ok → hint restock/estorno  
4. Frete own → só WA/loja  
5. Visão Revisão chips ≠ visão Problemas  

## Relação de módulos (sem módulo isolado)

```
Conta report → customer_report_delivery_issue → occurrence_*
Revisão fila → admin_list_revisao_queue_rows → OrderOps
OrderOps stages → admin_post_sale_case_action
Cliente Gerar código → melhorenvio-reverse → attach_me_return_code
Legal/ACK → returnPolicyCopy
```
