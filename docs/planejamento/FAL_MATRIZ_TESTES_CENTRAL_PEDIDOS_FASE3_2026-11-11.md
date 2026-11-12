# Matriz de testes — Central de Pedidos (Fase 3)

**Data:** 2026-11-11 · **Smoke M:** 2026-11-12  
**Auth:** eFe · MARCHA Gate 1+2  
**Escopo:** Central (sem STK bloqueante). Famílias do plano V2.  
**Última execução A:** 2026-11-11 (17 unit + SEC-01 + RPCs remotos)  
**Última execução M:** 2026-11-12 staff browser (localhost:5173)

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
| CEN-01 | Hub carrega áreas + indicadores | M | Contagens coerentes | ✅ 35 criados · líquido R$130,12 · áreas 3/2/0→sep/exp |
| CEN-02 | Fila área análise server-side | M/A | Pedido antigo elegível aparece | ✅ filtros unit + lista análise |
| CEN-03 | Cancel pending visão | M | Só `cancellation_request=pending` | ✅ fila vazia (rejected fora); path `/visao/solicitacoes-cancelamento` |
| CEN-04 | Voltar à fila restaura path | A/M | Área/lista preservada | ✅ unit nav + browser |
| CEN-05 | Paginação “carregar mais” | M | Offset estável | ⚠ N/A smoke — `ADMIN_LIST_PAGE_SIZE=200` > dataset (35); UI/hasMore no código |

## CP-T-PAY — Pagamento

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| PAY-01 | Aguardando pagamento na área | M | Status correto | ✅ 3 pedidos · Pendente / Pendente (expirado) |
| PAY-02 | Expire unpaid 48h | M | Pedidos saem da fila | ✅ fluxo hub+RPC (0 elegíveis <48h; fila permanece 3) |
| PAY-03 | Approve MP → análise | H | Webhook/confirm | ✅ Pix prod `66dd89ff` MP `189071738498` → approved → `em_analise` (sync; webhook prod ainda gap) · ver CP-PAY VAL |
| PAY-04 | Estorno manual mark refunded | M | payment refunded | P |

## CP-T-SEP — Separação

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| SEP-01 | Checkbox linha | M | `separated` persiste | ✅ `66dd89ff` → DB true + `em_separacao` |
| SEP-02 | Incomplete bloqueia concluir | M | Botão disabled + banner | ✅ 0/1 · Concluir disabled |
| SEP-03 | Completar → pronto_para_envio | M | RPC OK | ✅ status `pronto_para_envio` |
| SEP-04 | Qty parcial → ocorrência | M | Sem multi-envio | ✅ copy UI no banner |

## CP-T-PKG — Packing

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| PKG-01 | Salvar N volumes | M | `metadata.packing` | ✅ `6eb61dd5` 20×15×10 / 0,5 kg · `me` intacto |
| PKG-02 | Unidades cm/kg | A | Payload | ✅ |
| PKG-03 | Pós-enviado readonly | A/M | RPC bloqueia | ✅ SQL audit |
| PKG-04 | Não sobrescreve `metadata.me` | A | jsonb_set só packing | ✅ audit + remota + smoke |

## CP-T-ME — Melhor Envio

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| ME-01 | Painel só provider ME | A/M | Own sem ME | ✅ shippingKind unit + wizard Frete ME em `6eb61dd5` |
| ME-02 | Quote→prepare | M/H | label_state | ✅ live `6eb61dd5`: quoted R$11,15 → prepare → `cart` |
| ME-03 | Purchase GATE | H | CNPJ/saldo | P (não executado — custo real; aguarda eFe) |
| ME-04 | Ship ≠ purchase | M | Status enviado só no ship | ✅ `6eb61dd5` no carrinho ME ainda `pronto_para_envio` |

## CP-T-OWN — Frete próprio

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| OWN-01 | OwnShipPanel visível | M | provider=own | ✅ painel em non-ME (`mock` → “Expedição manual”); fixture `own` ativo ausente |
| OWN-02 | Registrar enviado | M | tracking | ✅ `66dd89ff` → `enviado` · tracking `SMOKE-OWN-20261112` |
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
| UI-01 | Wizard âncoras | A/M | steps | ✅ unit + `#ops-volumes` ME/own |
| UI-02 | Próximo passo legível | M | banner | ✅ “Expedir / Iniciar / Concluir separação…” |
| UI-03 | Erro RPC legível | M | toUserMessage | P |
| UI-04 | Voltar fila / nav | A | session path | ✅ |

## CP-T-EVT — Ocorrências

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| EVT-01 | Abrir ocorrência | M | occurrence_opened | ✅ UI + evento `6eb61dd5` |
| EVT-02 | Resolver exige solução | A/M | solucao obrigatoria | ✅ SQL audit |
| EVT-03 | Estado = último evento | A | unit | ✅ |

## CP-T-TRK — Rastreio

| ID | Caso | Tipo | Critério | Resultado |
|----|------|------|----------|-----------|
| TRK-01 | Ship gera evento | M | timeline | ✅ `order_shipped` + UI “Pedido enviado” |
| TRK-02 | Deliver | M | entregue | ✅ `order_delivered` · status `entregue` |
| TRK-03 | Webhook ME auto | — | Fora (evolução) | — |

## CP-T-REG — Regressão border (não bloqueia Gate 3)

| ID | Caso | Nota |
|----|------|------|
| REG-STK-01 | Cancel pré-ship release | Módulo estoque |
| REG-STK-02 | Fulfill pós-ship | Módulo estoque |

---

## Resumo desta rodada

**A:** 17 PASS unit · SEC-01 live · RPCs + CAN-POST + packing guards.  
**M (2026-11-12):** CEN · PAY-01/02 · SEP · PKG-01 · ME-01/04 · OWN-01/02 · UI-01/02/04 · EVT-01 · TRK-01/02.

**Bloqueio Gate 3:** **ME-03** (compra etiqueta em `VITE_SHIPPING_ME_ENV=production` — custo real). PAY-03 ✅.

## Ordem restante

1. H: ME-03 só com autorização eFe (saldo ME produção)
2. Ops: webhook MP prod (gap conhecido; sync mitiga)
3. Push+deploy só com autorização explícita
4. Gate 3 após ME-03 ou decisão eFe de adiar compra
