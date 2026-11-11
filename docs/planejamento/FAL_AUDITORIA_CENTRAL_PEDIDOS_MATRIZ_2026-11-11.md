# Auditoria — Central de Pedidos FAL (Matriz)

**Versão:** V2 · **Data:** 2026-11-11  
**Auth:** eFe — Auditoria 0 + consolidação V2  
**Escopo leitura:** código + migrations + Edges + VALs (`fal-pecas/`)  
**Runtime VALs:** `wtbpwuiayednvlhvuhbh` · Netlify eFe  
**Plano:** [FAL_PLANO_CENTRAL_PEDIDOS_4_FRENTES_2026-11-11.md](./FAL_PLANO_CENTRAL_PEDIDOS_4_FRENTES_2026-11-11.md)  
**Mapa:** [FAL_MAPA_JORNADA_CENTRAL_PEDIDOS_2026-11-11.md](./FAL_MAPA_JORNADA_CENTRAL_PEDIDOS_2026-11-11.md)

---

## Changelog V1 → V2

| Mudança | Motivo |
|---------|--------|
| CP-STK-* marcados **Fora do escopo Central** (módulo estoque) | Decisão eFe |
| Removidos STK/F7F da lista de bloqueadores P0 da Central | Idem |
| P0 único: FRE-022 → SEC-030 → CEN-040 | Corrigir inconsistência V1 |
| CP-CEN-011: fórmula financeira única (recebido líquido) | Evitar desconto duplo |
| CP-EVT-01: occurrence_id + estado = último evento | Ressalva eFe |
| CP-EMB: multi-volume, unidades, snapshot, invalidação | Ressalva eFe |
| CP-SEC: inventário obrigatório antes de revoke | Ressalva eFe |
| CP-ME-WH / OWN: rastreio manual com histórico | Ressalva eFe |
| CP-CAN-POST: regra pós-despacho (UI) sem tocar inventário | Escopo |
| Evidências V1 preservadas | Não apagar histórico |

---

## 0. Método

Classificações: Implementado e validado · parcialmente · com falha · Não implementado · Não homologado · Não aplicável · **Fora do escopo Central**.

Regras: código ≠ homologação · VAL antigo revalidado · sem evidência → não confirmado · gravidades crítica/alta/média/baixa.

Colunas: ID · Área · Recurso · Situação · Evidência · Arquivo/função · Backend · Banco · Problema · Gravidade · Dependência · Ação · Fase · Critério de aceite.

---

## 1. Veredito executivo

Central **existe** (hub + 4 áreas + detalhe + F7 ops + ME + Meus Pedidos). Não é placeholder.

### Bloqueadores da Central (V2)

| Prio | ID | Tipo | Problema |
|------|-----|------|----------|
| P0-1 | CP-FRE-022 | Smoke | **PASS** (VAL 2026-11-11) |
| P0-2 | CP-SEC-030 | Inventário→SQL | **CORRIGIDO** (revoke prod 2026-11-11) |
| P0-3 | CP-CEN-040 | Código | **CORRIGIDO** (filas server-side) |
| Alta | CP-ME-PUR | Humano | Purchase ME GATE |
| Alta | CP-PAY-021 | Humano | Approve MP prod |
| — | CP-EMB-01 | Código | **FEITO** packing multi-volume |
| — | CP-EVT-01 | Código | **FEITO** ocorrências staff |
| — | CP-OWN-ME | Código | **CORRIGIDO** (branch ME/own) |
| — | CP-CEN-011 | Código | **FEITO** indicadores Hub |
| — | CP-CAN-POST | UI+RPC | **FEITO** bloqueio pós-despacho |

### Fora do escopo (módulo estoque — evidência preservada)

| ID | Problema | Destino |
|----|----------|---------|
| CP-STK-013 | Cancel Onda2 pós-ship vs baixa | Módulo estoque |
| CP-STK-051 | Paths release divergentes | Módulo estoque |
| CP-STK-F7F / 050 / 052 | Reserva/baixa/release | Módulo estoque |

**Gate 0:** matriz/mapas/plano V2 publicados · **assinado eFe 2026-11-11 (MARCHA)**.

---

## 2. Matriz principal

### 2.1 Central

| ID | Área | Recurso | Situação | Evidência | Arquivo/função | Backend | Banco | Problema | Gravidade | Dependência | Ação | Fase | Critério de aceite |
|----|------|---------|----------|-----------|----------------|---------|-------|----------|-----------|-------------|------|------|-------------------|
| CP-CEN-010 | Central | Hub 4 áreas | Não homologado | Código + VAL UX parcial | `AdminOrdersHubPage` | counts RPC | orders | Atenção limitada à 1ª página | alta | CP-CEN-040 | Homologar + atenção server | 1 | Contagens = filas |
| CP-CEN-011 | Central | Indicadores financeiros | **Feito** | Hub + `admin_central_indicators` | Hub | RPC | payments/orders | — | baixa | — | Manter | 1 | Recebido líquido = capturado − devolvido; ops≠fin |
| CP-CEN-013 | Central | Exigem atenção | Implementado com falha | Max 8 sobre rows | Hub + ops | list | orders | Omite elegíveis | alta | CP-CEN-040 | Query server | 1 | Todos elegíveis |
| CP-CEN-040 | Central | Filas server-side | **Corrigido** | VAL 2026-11-11 · statuses/cancel/problems server | Area/View/Lista/Hub | adminListOrders | orders | — | baixa | — | Manter | 1 | Elegível sempre listável |
| CP-CEN-050 | Central | Visão cancel pending | **Corrigido** | CEN-040 `cancellationRequest` server | ViewPage | adminListOrders | cancellation_request | — | baixa | CP-CEN-040 | Manter | 1 | Todos pending |

### 2.2 Detalhe / separação / print

| ID | Área | Recurso | Situação | Evidência | Arquivo/função | Backend | Banco | Problema | Gravidade | Dependência | Ação | Fase | Critério de aceite |
|----|------|---------|----------|-----------|----------------|---------|-------|----------|-----------|-------------|------|------|-------------------|
| CP-DET-060 | Detalhe | Carga | Não homologado | joins | AdminOrderDetailPage | select | * | E2E G5 | média | staff | Smoke | 3 | Coerente c/ banco |
| CP-DET-065 | Detalhe | Snapshot comercial | Parcial | order_items | place_order | — | order_items | Apps N/C | média | — | Confirmar | 1 | Preço catálogo ≠ pedido |
| CP-SEP-068 | Separação | Checkbox linha | Não homologado | RPC | set_order_item_separated | RPC | separated | Integral por linha (V2) | média | — | E2E + ator | 1 | Evento staff |
| CP-SEP-071 | Separação | Conclusão | Parcial | SQL bloqueia | complete_order_separation | RPC | items | Qty parcial = divergência | média | Todos separated | Homologar | 3 | Incomplete falha |
| CP-SEP-QTY | Separação | Qty parcial | Não implementado (limitação) | Só boolean | order_items | — | quantity+separated | 4 de 5 sem campo qty_sep | média | Decisão V2 | Ocorrência + bloquear complete | 1 | Sem multi-envio |
| CP-PRT-090 | Print | Lista A4 | Não homologado | VAL 015 | adminOrderPrint | — | — | Sem storage | baixa | — | QA | 3 | Sem preços |
| CP-PRT-DOC | Print | Archive | **Spec feita** | FAL_SPEC_PRT_DOC_ARCHIVE | print + metadata | — | storage P2 | — | baixa | — | Storage = P2 | 1 | Reimprimível (futuro) |

### 2.3 Embalagem

| ID | Área | Recurso | Situação | Evidência | Arquivo/função | Backend | Banco | Problema | Gravidade | Dependência | Ação | Fase | Critério de aceite |
|----|------|---------|----------|-----------|----------------|---------|-------|----------|-----------|-------------|------|------|-------------------|
| CP-EMB-01 | Embalagem | Multi-volume neutro | **Feito** | `metadata.packing` + OrderPackingPanel | admin_set_order_packing | RPC | shipments.metadata | — | baixa | — | Manter | 1 | N volumes c/ id+unidades |
| CP-EMB-02 | Embalagem | Snapshot cotação | Parcial | quotes→metadata.me | quote-shipping | Edge | shipping_quotes | Drift re-quote | média | EMB-01 | Invalidar se mudar | 1 | Contratação congela snapshot |
| CP-EMB-03 | Embalagem | Box templates | Não homologado | Admin caixas | AdminShippingBoxesPage | — | shipping_box_templates | Catálogo ≠ pedido | baixa | — | Reusar | 1 | Sem duplicar |

### 2.4 Pagamentos

| ID | Área | Recurso | Situação | Evidência | Arquivo/função | Backend | Banco | Problema | Gravidade | Dependência | Ação | Fase | Critério de aceite |
|----|------|---------|----------|-----------|----------------|---------|-------|----------|-----------|-------------|------|------|-------------------|
| CP-PAY-020 | Pagamento | create-mp | **Smoke PASS** | VAL 2026-11-11 Pix R$1 | Edge | Edge | payments | — | alta | tokens | Manter | 4 | Cria cobrança; terminal sync cartão |
| CP-PAY-021 | Pagamento | Webhook confirm | **Parcial** | Pago live + sync manual; webhook prod gap | mp-webhook + sync-mp-payment | Edge+RPC | payments | Webhook só sandbox MCP | crítica ops | 017 painel prod | Configurar webhook prod | 4 | Libera c/ webhook **ou** sync |
| CP-PAY-IDEM | Pagamento | Idempotência | Parcial | mpWebhookCore | Edge | payment_events | Reteste | média | — | Teste dup | 3 | Sem dup transição |
| CP-PAY-REF | Pagamento | Estorno | Parcial | Manual + RPC | Onda2 | RPC | payments | ≠ cancel comercial | média | Ops | Runbook | 1 | Estorno documentado |

### 2.5 Estoque — FORA DO ESCOPO CENTRAL

| ID | Área | Recurso | Situação | Evidência | Problema | Ação | Fase |
|----|------|---------|----------|-----------|----------|------|------|
| CP-STK-050 | Estoque | Reserva place_order | Fora do escopo Central | F8 | — | Módulo estoque | — |
| CP-STK-052 | Estoque | Baixa ship | Fora do escopo Central | F7F | — | Módulo estoque | — |
| CP-STK-F7F | Estoque | Release transition | Fora do escopo Central | fase7f chama release | Hipótese “não libera” refutada no path transition | Documentar no módulo estoque | — |
| CP-STK-013 | Estoque | Cancel Onda2 pós-ship | Fora do escopo Central | admin_resolve + release sem reverter out | Risco inventário | Módulo estoque | — |
| CP-STK-051 | Estoque | Paths release | Fora do escopo Central | vários paths | Divergência | Módulo estoque | — |

**Nota:** Central pode bloquear UI de cancel “simples” pós-`enviado` (CP-CAN-POST) **sem** alterar RPCs de inventário.

| ID | Área | Recurso | Situação | Evidência | Ação | Fase | Aceite |
|----|------|---------|----------|-----------|------|------|--------|
| CP-CAN-POST | Cancel | Pós-despacho comercial | **Corrigido** | UI+RPC bloqueiam approve se enviado/entregue | detalhe + `admin_resolve…` | 1 | Sem approve cancel normal se enviado+ |

### 2.6 ME / frete / quotes

| ID | Área | Recurso | Situação | Evidência | Arquivo/função | Backend | Banco | Problema | Gravidade | Dependência | Ação | Fase | Critério de aceite |
|----|------|---------|----------|-----------|----------------|---------|-------|----------|-----------|-------------|------|------|-------------------|
| CP-FRE-022 | Frete | Persistência quotes | **Validado** | VAL 2026-11-11 · meq UUID + resolve RPC · ephemeral=0 | quote-shipping | Edge | shipping_quotes | — | baixa | — | Manter | 1 | Cotação consumível |
| CP-ME-080 | ME | Painel | Não homologado | MeExpeditionPanel | detalhe | Edge | metadata.me | Visível em own | média | provider | Branch | 1 | ME só se ME |
| CP-ME-PREP | ME | Prepare | Não homologado* | VAL 10/11 PASS | melhorenvio-label | Edge | cart | *melhor evidência | média | CNPJ | Manter | 4 | Prepare OK |
| CP-ME-PUR | ME | Purchase | Não homologado | GATE | purchase | Edge | purchased | Live | alta | saldo | Humano | 4 | Etiqueta comprada |
| CP-ME-WH | ME | Webhook jornada | Stub / evolução | stub:true | melhorenvio-webhook | Edge | ledger | Não atualiza | média | Decisão V2 | **Manual** na Central | 1 | Histórico por transição |
| CP-OWN-OPS | Próprio | Ops pós-checkout | Parcial | ship/deliver | detalhe | RPCs | shipments | Sem programação | alta | Spec | Completar + eventos | 1 | Ator+data |
| CP-OWN-ME | Próprio | ME em own | **Corrigido** | `OwnShipPanel` se provider≠ME | detalhe | — | provider | — | baixa | — | Manter | 1 | UI própria |

### 2.7 Ocorrências / cliente / segurança

| ID | Área | Recurso | Situação | Evidência | Arquivo/função | Backend | Banco | Problema | Gravidade | Dependência | Ação | Fase | Critério de aceite |
|----|------|---------|----------|-----------|----------------|---------|-------|----------|-----------|-------------|------|------|-------------------|
| CP-EVT-01 | Ocorrências | Staff + ID | **Feito** | open/update/resolve + UI | OrderOccurrencesPanel | admin_occurrence_action | order_events | — | baixa | — | Manter | 1 | Estado = último evento do id |
| CP-TRK-01 | Rastreio | Manual histórico | Parcial | status/ship fields | detalhe | events | shipments | Sem histórico de mudanças | alta | Spec | Evento por transição | 1 | Quem/quando/info |
| CP-CLI-100 | Cliente | Meus Pedidos | Não homologado | 006 I | AccountOrdersPage | RLS | orders | E2E | média | 006 | Smoke RLS | 3 | Só próprios |
| CP-CLI-103 | Cliente | Detalhe | Não homologado | 007 | AccountOrderDetail | visibility | events | Internal | média | 007 | Smoke | 3 | Internal oculto |
| CP-SEC-030 | Segurança | INSERT orders | **Corrigido** | VAL+inventário 2026-11-11 · revoke INSERT | migration `…183000_cp_sec030…` | PostgREST | orders | — | baixa | place_order DEFINER | Manter | 1 | Insert JWT falha; place_order OK |
| CP-SEC-035 | Segurança | shipments UPDATE | Parcial | staff write | F2 | — | shipments | Bypass ME | média | Inventário | Menor privilégio | 1 | Metadata só edge/RPC |

---

## 3. Revalidação VALs (preservada V1)

| VAL | Validade | Uso |
|-----|----------|-----|
| CENTRAL ME SANDBOX 04/11 | Parcial | Arquitetura |
| ADMIN UX 04/11 | Parcial | UX base |
| OPS CONFIRMAÇÃO/SEPARAÇÃO 04/11 | Parcial/Sim | Separação |
| REGRAS ONDA1/2 | Parcial | Decisão/cancel |
| MVP1 ESTOQUE/SEP 09/11 | Parcial | 015/031 print/UI |
| ME ETIQUETA 10/11 | Sim (prepare) | 014 |
| MVP1 PAGAMENTOS | Parcial | 016/017 |
| RECONCILIÇÃO MVP 10/11 | Sim | Estados oficiais |

---

## 4. Ajustes oficiais × Central V2

| ID | Leitura V2 |
|----|------------|
| 006/007 | N/H E2E — Fase 3–4 |
| 014 | prepare OK; purchase H; webhook manual |
| 015 | Print; smoke UI |
| 016/017 | Código OK; approve/cutover H |
| 031 | Sep física na Central; inventário = módulo estoque |
| 033/034 | Indicadores hub sem duplicar dashboard |

---

## 5. Divergências doc × código

FASE3/7 placeholder vs hub real → atualizar specs.  
F7F “não libera” → refutada no transition; riscos inventário fora do escopo Central.  
Plano logística hub ME GAP → hub logística existe.

---

## 6. Não confirmados

Cron prod · smoke browser staff · purchase ME live · webhook MP prod · apps no detalhe · >200 pedidos · itemPreviewByOrderId.  
~~shipping_quotes no remoto~~ → **confirmado** (FRE-022 VAL).

---

## 7. Gate 0

| Campo | Valor |
|-------|-------|
| Matriz V2 | SIM |
| Mapa V2 | SIM |
| Plano V2 | SIM |
| Escopo sem estoque | SIM |
| P0 único | FRE→SEC→CEN |
| Aprovação eFe | **ASSINADO** 2026-11-11 (MARCHA) |

**Gates 0–2 assinados** · Fase 3 matriz aberta · sem STK.
