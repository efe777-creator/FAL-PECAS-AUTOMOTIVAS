# FAL — Plano de implementação: Camada pós-venda

**Data:** 2026-11-21  
**Status:** F1–F3 **FECHADAS** na `dev` (2026-11-21). HOLD humano: nenhum pedido ME entregue com `cart_item_id` numérico no banco — generate live aguarda 1ª etiqueta real.  

**Branch:** `dev` (nunca `main`/prod sem autorização)  
**Spec:** [FAL_SPEC_POS_VENDA_CAMADA_PEDIDO_2026-11-21.md](./FAL_SPEC_POS_VENDA_CAMADA_PEDIDO_2026-11-21.md)  
**Auditoria:** [FAL_AUDITORIA_INTEGRAL_POS_VENDA_2026-11-21.md](./FAL_AUDITORIA_INTEGRAL_POS_VENDA_2026-11-21.md)  
**Jornadas / UX:** [FAL_JORNADAS_UX_POS_VENDA_2026-11-21.md](./FAL_JORNADAS_UX_POS_VENDA_2026-11-21.md)  

Ordem obrigatória: **D13** — Fase 1 → Fase 2 → Fase 3.  
Cada fase: testes + VAL curto + commit na `dev`. Preview Netlify opcional; **sem** `--prod`.  
Leitura obrigatória antes de codar: Spec §D1–D18 + Jornadas (telas, dois relógios, caminhos canônicos).

---

## Matriz por fase (tela × função × controle × VAL)

| Fase | Telas | Funções-chave | Controle Central | Período | Critério de saída | VAL mínimo |
|------|-------|---------------|------------------|---------|-------------------|------------|
| **1** | Conta detalhe/lista; OrderOps banner; legal | Labels D6; tracking; gate 7d; report tipado; confirm; banner ME | Ops no pedido + inbox | T0 = `entregue` | Copy clara + ocorrência tipada usável | Rastreio; Chegou; report+ACK; bloqueio fora janela; confirm OK |
| **2** | `revisao-logistica` + chips; OrderOps tipos | Lista unificada; chips D12; occurrence actions | **Hub Revisão** = dono da fila | Dias restantes (leitura) | Contagens = listas; Abrir guia | Badge≈lista; chip Devolução; guia abre OrderOps |
| **3** | Conta pós-autorização; OrderOps stages | Stages; Edge reversa; min PAC/SEDEX; WA/loja; restock/refund | Revisão + OrderOps | Validade código ME | Devolução ponta a ponta | ME gera código; fallback WA/loja; restock+refund |

### Gates entre fases

| Gate | Condição para avançar |
|------|------------------------|
| F1 → F2 | T0 documentado em código (delivered_at); report tipado + ACK em produção `dev`; banner ME sugerir (ou N/A com evidência) |
| F2 → F3 | `adminListLogisticsQueue('revisao')` lista ocorrências abertas; chips operacionais; VAL contagens=listas PASS |
| F3 → done | Caso ME + caso fallback VAL; sem status comercial `devolucao`; sem módulo isolado |

### Checklist anti-erro (impl.)

- [x] Confirm receipt ≠ T0 da janela  
- [x] Caso aberto não expira só por calendário  
- [x] Sem auto-`deliver_order`  
- [x] Sem gerar código ME na abertura do caso  
- [x] Sem `/admin/pos-venda` ou novo `moduleKey`  
- [x] Sem misturar visão `problemas` com RMA  
- [x] Copy legal via `returnPolicyCopy`  
- [x] Edge reversa separada da ida (`reverse: false`)  

Evidência: [FAL_VAL_POS_VENDA_2026-11-21.md](./FAL_VAL_POS_VENDA_2026-11-21.md)

### Dependências

- Aprovação humana Spec + Jornadas antes da marcha de **código** F1.  
- Secrets ME produção: bloqueiam só **F3**, não F1–F2.

---

## Mapa de arquivos (visão geral)

| Área | Criar / evoluir |
|------|-----------------|
| Copy política | **Criar** `fal-pecas/src/lib/returnPolicyCopy.ts` (+ test) |
| Lifecycle | Evoluir `fal-pecas/src/lib/orderLifecycle.ts` (+ tests CTA/timeline) |
| Conta | Evoluir `AccountOrderDetailPage.tsx`, `customerOrderActions.ts` |
| Legal | Evoluir `LegalDocumentPage.tsx` / `legalVersions.ts` (versão returns) |
| Ocorrências | Evoluir `orderOccurrences.ts`, `OrderOccurrencesPanel.tsx` |
| OrderOps | Evoluir `OrderOpsSurface.tsx`, `orderOpsActions.ts`, slot expedição (banner ME) |
| Filas | Evoluir `adminOrderService.ts` (`revisao`), `adminLogisticsQueues.ts`, `AdminOrdersViewPage.tsx` |
| RPC | Nova migration: report tipado + stages ops + gate 7d |
| ME reversa | Nova ação Edge (ex. `melhorenvio-reverse` ou action em label) + service admin/cliente |
| Tracking | Reforçar ship/apply_me_tracking + UI |

---

## Fase 1 — Entrega, rastreio, problema tipado

**Objetivo:** T0 da janela sólido; copy D6/D7; problema com motivos + escopo + política ACK; Confirmar permanece.

### Tarefas

1. **Labels cliente (D6)**  
   - Arquivo: `orderLifecycle.ts`  
   - `enviado` frete → “Aguardando entrega”; `entregue` → “Sua entrega chegou”  
   - Pickup: manter “Pronto para retirar” / “Retirada feita”  
   - Atualizar `orderLifecycle.timeline.test.ts` / `customerCta.test.ts`

2. **Rastreio no despacho**  
   - Garantir `ship_order` / painel ME grava `tracking_code` + `tracking_url`  
   - Cliente: destaque do link em `AccountOrderDetailPage` (já usa `buildTrackingUrl`)  
   - Se ME atrasa código: manter `shipment_tracking_updated` + refresh

3. **Sugestão ME delivered (D5)**  
   - Ler `shipments.metadata.me.tracking_events` / `last_webhook_event`  
   - Banner no OrderOps quando `enviado` + sinal delivered  
   - CTA confirma → `deliver_order` existente  
   - **Não** auto-avançar

4. **Recebedor LGPD (D7)**  
   - Se webhook/API trouxer nome: espelho curado em evento `customer`; completo em `internal`  
   - UI: “Recebido por {nomeMinimizado}” opcional

5. **Janela 7 dias (D4)**  
   - Helper `postSaleWindowOpen(deliveredAt, now)`  
   - RPC report: rejeitar nova abertura se fora da janela **e** sem caso aberto  
   - UI: ocultar/desabilitar “Informar problema” com mensagem se fechado

6. **Copy política compartilhada (D14)**  
   - Criar `returnPolicyCopy.ts`  
   - Usar no formulário + alinhar bullets de `LegalDocumentPage` (`trocas-devolucoes`)  
   - Bump `legalVersions` returns

7. **RPC `customer_report_delivery_issue` evoluída**  
   - Params: motivo_code, note, scope, items[], policy_ack  
   - Validar ACK + itens quando motivo ∈ incompat/devolução  
   - Payload ocorrência tipada (Spec §5–§6)  
   - Um `occurrence_id` (D10)  
   - Migration nova (não editar migration antiga aplicada)

8. **UI formulário problema**  
   - `AccountOrderDetailPage` (+ componente extraído se necessário)  
   - CTAs bloco pós-chegada: Confirmar + Problema (D8)  
   - `customerOrderActions.ts` tipado

9. **Testes Fase 1**  
   - Unit: window, lifecycle labels, policy copy  
   - RPC: smoke SQL ou test harness existente  
   - Manual: pedido `entregue` → report com item → evento no detalhe

### VAL Fase 1 (checklist)

- [ ] Despacho mostra rastreio na conta  
- [ ] Copy Aguardando / Chegou  
- [ ] Banner ME suggest (se metadata presente)  
- [ ] Report tipado + ACK + item  
- [ ] Fora de 7d sem caso: bloqueado  
- [ ] Confirm receipt idempotente  

### Critério de saída Fase 1

Pedido entregue com experiência clara + ocorrência tipada utilizável pelo ops no painel atual (mesmo sem chips).

---

## Fase 2 — Central Revisão + chips

**Objetivo:** Ops vê todos os casos sem caçar inbox; padrão guias intacto.

### Tarefas

1. **Corrigir `adminListLogisticsQueue('revisao')`**  
   - União: `own_manual_reviews` pending **∪** orders com ocorrência aberta (derive ou RPC)  
   - Alinhar com `admin_logistics_queue_counts.revisao` (contagens = listas)  
   - Arquivos: `adminOrderService.ts`, possivelmente RPC SQL nova/ajuste

2. **Chips D12**  
   - UI em `AdminOrdersViewPage` / barra logística  
   - Filtros client ou query: Todas / Suporte / Devolução-incompat / Aguardando ops (`stage` aberto|em_analise)

3. **Alinhar tipos no `OrderOccurrencesPanel`**  
   - Select admin inclui tipos pós-venda; mapear legado `pos_entrega`

4. **Permissões**  
   - Reusar RBAC staff existente; sem rota nova

5. **Testes**  
   - Lista mostra pedido só com ocorrência cliente  
   - Chip filtra  
   - Abrir guia → OrderOps → painel

### VAL Fase 2

- [ ] Contador revisão ≈ itens listáveis  
- [ ] Chip Devolução mostra só casos tipados  
- [ ] Abrir guia funciona como hoje  

### Critério de saída Fase 2

Ops trabalha pós-venda só pela Central + guia, sem módulo novo.

---

## Fase 3 — Devolução, ME reversa, fallback

**Objetivo:** Pipeline autorizado → código ME (FAL paga) ou WA/loja → conferência → resolução.

### Tarefas

1. **Stages no caso**  
   - RPCs ops: autorizar / recusar / marcar aguardando_peca / conferência / resolver  
   - Entrypoint: `orderOpsActions`  
   - UI: `OrderOccurrencesPanel` ou seção dedicada **dentro** do OrderOps

2. **Elegibilidade ME reversa**  
   - Helper: provider ME + volume único + `entregue` + stage `autorizada`  
   - Senão: forçar `return_mode` wa|loja

3. **Edge logística reversa**  
   - Cart reverse (order_id ME original) → purchase (conta FAL) → generate  
   - Cotar PAC/SEDEX → min preço (D17); aceitar override ops  
   - Persistir código/validade/DC-e em metadata + evento customer  
   - Secrets: mesmos ME; **produção** para generate (sandbox limitado)

4. **CTA cliente “Gerar código” (D16)**  
   - Só se `autorizada` + elegível + ainda sem código válido  
   - Exibir instruções Correios + DC-e + validade  

5. **Fallback D18**  
   - [x] CTAs WA tipados (pedido + caso + período/modo) — `buildPostSaleWhatsAppMessage` + `PostSaleWhatsAppButton`  
   - [x] “Devolver na loja” — texto + WA para combinar (sem agenda)

6. **Resolução**  
   - Conferência: nota condição (sujo/usado → recusa fundamentada)  
   - Aprovar: `restock_order_item_physical` + fluxo refund pending / marcar estornado  
   - `occurrence_resolved` com solução

7. **Legal**  
   - Atualizar copy: frete retorno por conta FAL quando autorizado; canal no pedido

8. **VAL Fase 3**  
   - [x] Código: stages + Edge `melhorenvio-reverse` + CTA cliente + fallback WA/loja (commit F3)  
   - [x] Frete próprio: UI força WA/loja (elegibilidade)  
   - [x] Override SEDEX no ops (authorize)  
   - [x] Conferência → restock/estorno via OrderOps (hint + botão estorno em `approved`)  
   - [x] Smoke dry-run stages→código→evento (`scripts/smoke-me-reverse.mjs`, gate PASS)  
   - [ ] Pedido ME real (cart_item_id válido, sem forceDryRun) → generate live  


### Critério de saída Fase 3

Devolução rastreável ponta a ponta sem status comercial `devolucao` e sem app admin isolado.  
**Código F3:** entregue na `dev`. **VAL E2E ME:** depende de secrets produção + pedido real.

---

## Fora desta implementação

- Auto-`deliver_order`  
- Estorno MP API automático  
- Multi-volume reversa  
- Agenda loja  
- Push `main` / deploy produção  

---

## Sequência de commits sugerida (quando codar)

1. `docs:` (já feito nesta marcha)  
2. `feat(pos-venda): fase1 labels rastreio janela report tipado`  
3. `feat(pos-venda): fase2 fila revisao chips`  
4. `feat(pos-venda): fase3 reversa ME stages fallback`  

Cada commit só na **`dev`**.

---

## Dependências humanas antes da Fase 1 de código

1. Revisar e **aprovar** Spec + Auditoria + **Jornadas/UX**.  
2. Autorizar marcha de implementação na `dev`.  
3. Confirmar secrets ME produção para Fase 3 (não bloquear Fase 1–2).  
4. Respeitar **gates** F1→F2→F3 da matriz acima.  

---

## Referências rápidas de código

| Peça | Path |
|------|------|
| Pós-entrega UI | `fal-pecas/src/pages/Account/AccountOrderDetailPage.tsx` |
| Ações cliente | `fal-pecas/src/services/orders/customerOrderActions.ts` |
| Lifecycle | `fal-pecas/src/lib/orderLifecycle.ts` |
| Tracking URL | `fal-pecas/src/lib/shipmentTrackingUrl.ts` |
| Ocorrências | `fal-pecas/src/lib/orderOccurrences.ts` |
| Painel ocorrências | `fal-pecas/src/components/admin/orders/OrderOccurrencesPanel.tsx` |
| OrderOps | `fal-pecas/src/components/admin/orders/OrderOpsSurface.tsx` |
| Lista revisão | `fal-pecas/src/services/admin/adminOrderService.ts` → `adminListLogisticsQueue('revisao')` |
| Views | `fal-pecas/src/lib/adminOrderOps.ts` |
| Report RPC | `fal-pecas/supabase/migrations/20261112196000_customer_post_delivery_actions.sql` |
| ME label | `fal-pecas/supabase/functions/melhorenvio-label/index.ts` |
| ME webhook | `fal-pecas/supabase/functions/melhorenvio-webhook/index.ts` |
| Legal | `fal-pecas/src/pages/Legal/LegalDocumentPage.tsx` |
