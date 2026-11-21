# FAL — AUDITORIA INTEGRAL: Pós-venda / pós-entrega / devolução

**Data:** 2026-11-21  
**Natureza:** auditoria técnica, funcional, operacional e arquitetural — **somente leitura**  
**Projeto Supabase:** `wtbpwuiayednvlhvuhbh`  
**App:** `fal-pecas/`  
**Branch de trabalho:** `dev`  
**Status do documento:** AUDITORIA CONCLUÍDA NESTA RODADA — **não autoriza implementação de código**  
**Princípio:** uma arquitetura coerente — camada no pedido; **não** módulo isolado  

**Spec alvo:** [FAL_SPEC_POS_VENDA_CAMADA_PEDIDO_2026-11-21.md](./FAL_SPEC_POS_VENDA_CAMADA_PEDIDO_2026-11-21.md)  
**Jornadas / UX:** [FAL_JORNADAS_UX_POS_VENDA_2026-11-21.md](./FAL_JORNADAS_UX_POS_VENDA_2026-11-21.md)  
**Plano de impl.:** [FAL_PLANO_IMPL_POS_VENDA_2026-11-21.md](./FAL_PLANO_IMPL_POS_VENDA_2026-11-21.md)

---

## 1. Resumo executivo

A FAL já opera o ciclo feliz do pedido até **`entregue`** (F6D/F7 + OrderOps + Adaptive). O pós-venda **mínimo G6/032** está no ar: legal `/trocas-devolucoes`, WhatsApp contextual, confirmar recebimento, reportar problema → ocorrência `pos_entrega`, restock/estorno **manuais**.

**Não existe** RMA estruturado, janela de 7 dias enforced no código, logística reversa Melhor Envio, stages de devolução, nem fila Revisão que liste ocorrências do cliente de forma confiável (contador ≠ lista).

### O que já existe e será reaproveitado (REUSAR)

| Domínio | Contrato atual |
|---------|----------------|
| Status comercial | `orders.status` + `order_transition_allowed` / RPCs |
| Histórico | `order_events` (append-only) |
| Problemas | Ocorrências derivadas (`occurrence_id` em payload) |
| Conta | `AccountOrderDetailPage` bloco Pós-entrega |
| Ops | Adaptive + `OrderOpsSurface` + guias + `orderOpsActions` |
| Fila | Visão `revisao-logistica` (a corrigir, não substituir) |
| ME ida | `melhorenvio-label` + webhook tracking-only |
| Dinheiro / estoque | `admin_mark_payment_refunded` · `restock_order_item_physical` |
| Legal | `LegalDocumentPage` + `legalVersions` |

### O que precisa ser estendido (não duplicado)

- Motivos tipados + escopo pedido/itens no report  
- Labels cliente (“Aguardando entrega” / “Sua entrega chegou”)  
- Sugestão ME delivered no OrderOps (sem auto-`deliver_order`)  
- Lista Revisão alimentada por ocorrências + chips  
- Stages de devolução **no caso**, não em `orders.status`  
- Ação Edge de **logística reversa** ME (separada da ida `reverse: false`)  
- Copy de política única + ACK no formulário  

### O que realmente precisa ser criado (Fases futuras)

- Gatilho cliente “Gerar código de devolução” pós-autorização  
- Cotação PAC/SEDEX → mais barato (conta FAL)  
- Fallback UI: WA + “Devolver na loja” (combinar WA)  
- Tabela `returns` **somente se** eventos forem inviáveis para fila (default: **não** nas Fases 1–2)  

### Maiores riscos

1. Criar `/admin/pos-venda` isolado e quebrar o padrão Adaptive/guias.  
2. Introduzir `orders.status = devolucao_*` e contaminar GMV/timeline.  
3. Auto-`deliver_order` via webhook ME sem confirmação.  
4. Gerar código ME na abertura da solicitação (custo + validade 7 dias ME).  
5. Duplicar copy legal em três fontes divergentes.  
6. Misturar visão `problemas` (pagamento/decisão) com pós-venda.  

### Onde estamos

| Camada | Estado |
|--------|--------|
| G6 / MVP 032 mínimo | **PASS** (legal + WA + confirm/report) |
| Ticket / RMA formal | Documentado como **evolução** (032) |
| Decisões produto D1–D18 | Travadas na Spec (2026-11-21) |
| Código pós-venda completo | **Não iniciado** — só docs nesta marcha |

---

## 2. Escopo e metodologia

### Escopo

Auditar pedidos, conta, admin, comunicação, pagamentos, estoque/logística, arquitetura e documentação relacionados a pós-entrega e devolução, cruzando com decisões D1–D18.

### Fora de escopo

Implementação de código, migrations aplicadas, deploys, Figma, push `main`/prod.

### Classificação de evidência

| Classe | Significado |
|--------|-------------|
| **CONFIRMADO_ATUAL** | Código + migration e/ou VAL |
| **PARCIAL** | Existe pedaço; falta regra/UI/fila |
| **AUSENTE** | Não há no código |
| **SÓ_DOCUMENTAÇÃO** | Só em doc |
| **DIVERGENTE** | Doc ≠ código |
| **REUSAR** / **NÃO FAZER** | Orientação arquitetural |

---

## 3. Inventário documental (cruzamento)

| Documento | Relação com pós-venda |
|-----------|------------------------|
| [ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md](./ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md) | Modelo status; **fora**: devolução/troca/reversa |
| [FAL_MAPA_JORNADA_CENTRAL_PEDIDOS_2026-11-11.md](./FAL_MAPA_JORNADA_CENTRAL_PEDIDOS_2026-11-11.md) | §12 atendimento/pós-venda; devolução → estoque |
| [FAL_AUDITORIA_PRONTIDAO_MVP_2026-11-09.md](./FAL_AUDITORIA_PRONTIDAO_MVP_2026-11-09.md) | **032** ticket formal = evolução |
| [FAL_MARCHA_G6_JURIDICO_POSVENDA_VAL_2026-11-16.md](./FAL_MARCHA_G6_JURIDICO_POSVENDA_VAL_2026-11-16.md) | G6 PASS |
| [FAL_VAL_JORNADA_CLIENTE_OPERADOR_2026-11-12.md](./FAL_VAL_JORNADA_CLIENTE_OPERADOR_2026-11-12.md) | Smoke D confirm/report |
| [FAL_MARCHA_ORDER_OPS_SURFACE_VAL_2026-11-19.md](./FAL_MARCHA_ORDER_OPS_SURFACE_VAL_2026-11-19.md) | Surface OrderOps |
| [FAL_PADRAO_ADAPTIVE_CENTRAL_PAINEL_CATALOGO_2026-11-21.md](./FAL_PADRAO_ADAPTIVE_CENTRAL_PAINEL_CATALOGO_2026-11-21.md) | Shell + guias; não copiar OrderOps para outro módulo |
| [FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md](./FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md) | Tokens / Adaptive / FL\* |
| [FAL_PLANO_JORNADA_FRETE_LOGISTICA_V2_2_2026-11-12.md](./FAL_PLANO_JORNADA_FRETE_LOGISTICA_V2_2_2026-11-12.md) | Contagens = listas |
| [FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md) | Etiqueta ME só Expedição; nunca no webhook MP |
| Specs ME / VALs etiqueta | Ida apenas; sem logística reversa |

---

## 4. Eixo 1 — Pedidos

### AS-IS (CONFIRMADO_ATUAL)

- Máquina: `confirmado` → `em_separacao` → `pronto_para_envio` → `enviado` → `entregue`.  
- `deliver_order` / `admin_confirm_store_pickup` fecham entrega; emitem `order_delivered`.  
- UI não faz `UPDATE` direto em `orders`.  
- Cancelamento pós-`enviado`/`entregue` bloqueado (CP-CAN-POST).  
- Fonte: `orderLifecycle.ts`, migrations F7A/F7E, `adminOrderService.ts`.

### Gaps vs D1–D18

| Decisão | Gap |
|---------|-----|
| D4 janela 7d | **AUSENTE** enforcement; só copy legal |
| D5 ME suggest | **AUSENTE** UI; webhook só metadata |
| D6 copy | **PARCIAL** — labels “Enviado”/“Entregue” |
| Status `devolucao` | **NÃO FAZER** — alinhado F6D |

### Reaproveitamento

Manter `entregue` como terminal feliz; stages pós-venda no caso/ocorrência.

---

## 5. Eixo 2 — Área do cliente

### AS-IS (CONFIRMADO_ATUAL)

- [`AccountOrderDetailPage.tsx`](../../fal-pecas/src/pages/Account/AccountOrderDetailPage.tsx): `canPostDelivery` = `enviado` \| `entregue`.  
- Confirmar recebimento → `customer_confirm_receipt` (exige `entregue`; não muda status).  
- Tive um problema → `customer_report_delivery_issue(reason)` → ocorrência `tipo: pos_entrega`.  
- Rastreio: `buildTrackingUrl` + código/URL no shipment.  
- CTAs: WA “Falar sobre este pedido”, link `/trocas-devolucoes`.  
- Lista: CTA “Acompanhar envio →” em `enviado` (não pickup); `entregue` sem CTA especial.  
- Migration: `20261112196000_customer_post_delivery_actions.sql`.

### Gaps

| Item | Classe |
|------|--------|
| Motivos tipados + itens (D9/D2/D10) | **AUSENTE** |
| Política ACK abundante (D14) | **AUSENTE** no formulário |
| “Aguardando entrega” / “Sua entrega chegou” (D6) | **AUSENTE** |
| Recebedor LGPD (D7) | **AUSENTE** |
| Janela 7d para abrir (D4) | **AUSENTE** |
| Gerar código ME (D16) | **AUSENTE** |
| Devolver na loja (D18) | **AUSENTE** |

### Reaproveitamento

Evoluir o bloco Pós-entrega existente; não criar rota `/conta/pos-venda`.

---

## 6. Eixo 3 — Painel administrativo

### AS-IS (CONFIRMADO_ATUAL)

- Hub Adaptive `moduleKey=orders`; Abrir guia / + Guia → `OrderOpsSurface`.  
- Visão [`revisao-logistica`](../../fal-pecas/src/lib/adminOrderOps.ts): “Revisão e ocorrências”.  
- Visão `problemas`: decisão rejeitada / cobrança falha — **outro domínio**.  
- `OrderOccurrencesPanel` + `admin_occurrence_action` (open → start → resolve → reopen).  
- `adminOrderNextStep('entregue')` = null.  
- Restock e “Marcar estorno feito” no OrderOps.

### Gap crítico — lista vs contagem (DIVERGENTE / PARCIAL)

- RPC `admin_logistics_queue_counts.revisao` inclui ocorrências abertas **OU** `own_manual_reviews` pending (CONFIRMADO em migrations M7).  
- `adminListLogisticsQueue('revisao')` busca **somente** `own_manual_reviews` pending ([`adminOrderService.ts` L732–770](../../fal-pecas/src/services/admin/adminOrderService.ts)).  
- **Efeito:** badge pode subir com report do cliente e a lista não mostra o pedido (só inbox).  
- Spec frete V2.2: “Contagens = listas” — **DIVERGENTE** aqui.

### Gaps vs D11–D12

Chips Todas / Suporte / Devolução / Aguardando ops: **AUSENTE**.  
Tipos admin no select não incluem `pos_entrega` alinhado: **PARCIAL**.

### Reaproveitamento / NÃO FAZER

Estender `revisao-logistica` + painel de ocorrências. **NÃO** criar menu Pós-venda nem `PostSaleOpsSurface`.

---

## 7. Eixo 4 — Comunicação

### AS-IS (CONFIRMADO_ATUAL)

- WhatsApp: `whatsapp.ts` / `buildOrderWhatsAppMessage`.  
- Inbox: `occurrence_opened`, `order_shipped`, `order_delivered`, `shipment_tracking_updated`, `customer_receipt_confirmed`.  
- Spec WhatsApp futuro: templates por stage ainda não operacionais como canal automático de devolução.

### Gaps

| Item | Classe |
|------|--------|
| WA como fallback devolução (D18) | **PARCIAL** (link existe; sem modo `retorno_wa` no caso) |
| Templates por stage RMA | **AUSENTE** (fora MVP) |
| E-mail loja | Dívida G6 / opcional |

---

## 8. Eixo 5 — Pagamentos

### AS-IS (CONFIRMADO_ATUAL)

- Estorno pós-cancel pré-envio: fluxo parcial + manual MP.  
- `payment.status` `refund_pending` / `pending_manual_refund` + `admin_mark_payment_refunded` no OrderOps.  
- Sem refund automático ao abrir ocorrência.

### Gaps

Encadear resolução de devolução → marcar refund: **PARCIAL** (botões existem; sem stage “reembolso pendente” tipado).  
Estorno MP API automático: **NÃO FAZER** no MVP pós-venda.

---

## 9. Eixo 6 — Estoque e logística

### AS-IS (CONFIRMADO_ATUAL)

- ME: quote → prepare → purchase → generate → print; `options.reverse: false` em `melhorenvio-label`.  
- Webhook: tracking-only; em “delivered” só `metadata.me.tracking_events`; **não** chama `ship_order`/`deliver_order`.  
- Ação `tracking` na Edge atualiza código/URL.  
- `restock_order_item_physical` (K13) para `enviado`/`entregue`.  
- Frete próprio: tracking via `admin_set_shipment_tracking`.

### Gaps

| Item | Classe |
|------|--------|
| Logística reversa ME API | **AUSENTE** no FAL; **existe** na API ME (docs oficiais) |
| Auto-sugerir entregue (D5) | **AUSENTE** |
| Frete devolução conta FAL (D15–D17) | **AUSENTE** |
| Fallback loja/WA (D18) | **AUSENTE** fluxo tipado |

### Nota ME (externo, documentado)

Reversa Correios: código digital (não etiqueta impressa), DC-e, validade ~7 dias, PAC/SEDEX, loja paga no checkout ME. Sandbox: geração de código limitada.

---

## 10. Eixo 7 — Arquitetura

### AS-IS (CONFIRMADO_ATUAL)

```
Cliente UI → customerOrderActions → RPC
Ops UI → orderOpsActions → RPC
Eventos → order_events → deriveOccurrences / inbox / timeline
```

- RLS: pedido próprio ou staff.  
- Ocorrências sem tabela dedicada (event-sourced).

### Recomendação arquitetural

| Fase | Persistência |
|------|----------------|
| 1–2 | Estender payload de `occurrence_*` (tipo, stage, items[], policy_ack, return_mode) |
| 3 | Avaliar tabela `post_sale_cases` / `returns` **só** se fila SQL por eventos for inviável |

**NÃO FAZER:** segundo bus de eventos; surface admin paralela; status comercial novo no MVP.

---

## 11. Eixo 8 — Documentação e conflitos

| Tema | Situação |
|------|----------|
| 032 ticket = evolução | **SÓ_DOCUMENTAÇÃO** até Spec 2026-11-21 promover roadmap |
| F6D “devolução fora” | **CONFIRMADO** — Spec trata como camada lateral |
| Contagens = listas (revisão) | **DIVERGENTE** código |
| G6 PASS | **CONFIRMADO** — mínimo; não cobre RMA |
| Mapa Central §12 | **SÓ_DOCUMENTAÇÃO** para fluxo devolução completo |

---

## 12. Matriz gap × decisão

| Decisão | AS-IS | Classe | Ação |
|---------|-------|--------|------|
| D1 Acesso no pedido | Detalhe existe | REUSAR | Evoluir bloco |
| D2 Escopo itens | Só texto motivo | AUSENTE | Fase 1 RPC/UI |
| D3 Autoriza ops | Occurrence resolve genérico | PARCIAL | Fase 3 stage autorizada |
| D4 7 dias | Copy legal | AUSENTE | Fase 1 gate |
| D5 ME suggest | Metadata only | AUSENTE | Fase 1 OrderOps |
| D6 Copy | Enviado/Entregue | PARCIAL | Fase 1 lifecycle |
| D7 Recebedor | — | AUSENTE | Fase 1 |
| D8 CTAs | Confirm+Problema+WA+legal | PARCIAL | Fase 1 focar Confirm+Problema no bloco pós-chegada |
| D9 Motivos | `pos_entrega` | AUSENTE tipagem | Fase 1 |
| D10 Um caso | Um occurrence_id | REUSAR | Payload itens |
| D11 Fila | View existe | PARCIAL | Fase 2 lista |
| D12 Chips | — | AUSENTE | Fase 2 |
| D13 Ordem | — | — | Plano impl. |
| D14 Política ACK | Legal page | PARCIAL | Fase 1 shared + form |
| D15–D17 ME reversa | — | AUSENTE | Fase 3 |
| D18 Fallback | WA link | PARCIAL | Fase 3 |

---

## 13. Jornadas AS-IS (resumo)

### Cliente hoje

Pagamento → análise → confirmado → separação → enviado (rastreio se houver) → ops marca entregue → Confirmar e/ou Problema → ocorrência → WA/legal.

### Operador hoje

OrderOps até deliver → se report: inbox/ocorrência (lista Revisão pode falhar) → resolve manual → restock/estorno se couber.

---

## 14. Conclusão da auditoria

O prédio sustenta a **camada pós-venda** sem módulo novo: evoluir conta + ocorrências + `revisao-logistica` + Edge ME reversa. O mínimo G6 está feito; o produto completo depende das Fases 1–3 da Spec/Plano, na ordem D13, preservando Adaptive/guias e `entregue` como âncora.

**Próximo artefato:** Spec canônica com D1–D18.  
**Implementação de código:** somente após revisão humana da Spec + autorização de marcha na `dev`.
