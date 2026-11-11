# Matriz de testes — Central de Pedidos (Fase 3)

**Data:** 2026-11-11  
**Auth:** eFe · MARCHA Gate 1+2  
**Escopo:** Central (sem STK bloqueante). Famílias do plano V2.  
**Última execução A:** 2026-11-11 (17 unit + SEC-01 + RPCs remotos)

## Legenda

| Símbolo | Significado |
|---------|-------------|
| P | Pendente execução |
| A | Automatizável (unit/RPC smoke) |
| M | Manual / staff browser |
| H | Humano (MP/ME live) |
| ✅ | PASS nesta rodada |

---

## CP-T-CEN — Central / filas

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| CEN-01 | Hub carrega áreas + indicadores | M | Contagens coerentes | P |
| CEN-02 | Fila área análise server-side | M/A | Pedido antigo elegível aparece | ✅ filtros unit |
| CEN-03 | Cancel pending visão | M | Só `cancellation_request=pending` | P (código OK) |
| CEN-04 | Voltar à fila restaura path | A/M | Área/lista preservada | ✅ unit nav |
| CEN-05 | Paginação “carregar mais” | M | Offset estável | P |

## CP-T-PAY — Pagamento

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| PAY-01 | Aguardando pagamento na área | M | Status correto | P |
| PAY-02 | Expire unpaid 48h | M | Pedidos saem da fila | P |
| PAY-03 | Approve MP → análise | H | Webhook/confirm | P |
| PAY-04 | Estorno manual mark refunded | M | payment refunded | P |

## CP-T-SEP — Separação

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| SEP-01 | Checkbox linha | M | `separated` persiste | P |
| SEP-02 | Incomplete bloqueia concluir | M | Botão disabled + banner | P (UI feita) |
| SEP-03 | Completar → pronto_para_envio | M | RPC OK | P |
| SEP-04 | Qty parcial → ocorrência | M | Sem multi-envio | P (copy UI) |

## CP-T-PKG — Packing

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| PKG-01 | Salvar N volumes | M | `metadata.packing` | P · RPC ✅ remota |
| PKG-02 | Unidades cm/kg | A | Payload | ✅ |
| PKG-03 | Pós-enviado readonly | A/M | RPC bloqueia | ✅ SQL audit |
| PKG-04 | Não sobrescreve `metadata.me` | A | jsonb_set só packing | ✅ audit + remota |

## CP-T-ME — Melhor Envio

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| ME-01 | Painel só provider ME | A/M | Own sem ME | ✅ shippingKind unit |
| ME-02 | Quote→prepare | M/H | label_state | P |
| ME-03 | Purchase GATE | H | CNPJ/saldo | P |
| ME-04 | Ship ≠ purchase | M | Status enviado só no ship | P |

## CP-T-OWN — Frete próprio

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| OWN-01 | OwnShipPanel visível | M | provider=own | P |
| OWN-02 | Registrar enviado | M | tracking | P |
| OWN-03 | Wizard etiqueta skipped | A | unit | ✅ |

## CP-T-SEC — Segurança

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| SEC-01 | INSERT orders JWT falha | A | 42501 | ✅ |
| SEC-02 | place_order autenticado OK | M/H | Checkout | P |
| SEC-03 | Cancel approve pós-ship falha | A | CAN-POST guard remoto | ✅ |

## CP-T-UI — UX

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| UI-01 | Wizard âncoras | A/M | steps | ✅ unit wizard |
| UI-02 | Próximo passo legível | M | banner | P |
| UI-03 | Erro RPC legível | M | toUserMessage | P |
| UI-04 | Voltar fila / nav | A | session path | ✅ |

## CP-T-EVT — Ocorrências

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| EVT-01 | Abrir ocorrência | M | occurrence_opened | P · RPC ✅ |
| EVT-02 | Resolver exige solução | A/M | solucao obrigatoria | ✅ SQL audit |
| EVT-03 | Estado = último evento | A | unit | ✅ |

## CP-T-TRK — Rastreio

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| TRK-01 | Ship gera evento | M | timeline | P |
| TRK-02 | Deliver | M | entregue | P |
| TRK-03 | Webhook ME auto | — | Fora (evolução) | — |

## CP-T-REG — Regressão border (não bloqueia Gate 3)

| ID | Caso | Nota |
|----|------|------|
| REG-STK-01 | Cancel pré-ship release | Módulo estoque |
| REG-STK-02 | Fulfill pós-ship | Módulo estoque |

---

## Resumo desta rodada (A)

**17 PASS** unit · SEC-01 live · 4 RPCs presentes no remoto · CAN-POST + packing guards confirmados.

**Bloqueio Gate 3:** casos **M/H** (smoke staff + ME/MP).

## Ordem restante

1. Smoke M: CEN-01/03/05 · SEP-01/02/03 · UI-02 · OWN-01 · EVT-01  
2. H: PAY-03 · ME-02/03  
3. Gate 3 quando crítico/alto = 0 sem decisão eFe
