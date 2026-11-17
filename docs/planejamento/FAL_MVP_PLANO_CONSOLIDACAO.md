# FAL — Plano de consolidação do MVP (execução assertiva)

**Versão:** 1.1  
**Data:** 2026-11-16  
**Status:** CANÔNICO — documento de **execução**  
**MVP:** [FAL_MVP_COMPLETO_4.0.md](./FAL_MVP_COMPLETO_4.0.md)  
**Telas:** [FAL_MVP_MAPA_TELAS_JORNADAS.md](./FAL_MVP_MAPA_TELAS_JORNADAS.md)  
**Evidência:** [FAL_AUDITORIA_CONSOLIDADA_PRD4.md](./FAL_AUDITORIA_CONSOLIDADA_PRD4.md)  
**PRD:** [FAL_PRD_4.0.md](../entrada/FAL_PRD_4.0.md)  
**Índice:** [FAL_INDICE_CANONICO.md](../entrada/FAL_INDICE_CANONICO.md)

---

## 0. Como usar este documento

1. Executar **somente a frente aberta** (status abaixo).  
2. Cada passo é **PASS / FAIL / BLOCKED**. Sem “quase”.  
3. **STOP** = não avançar gate seguinte.  
4. Registrar evidência (VAL, print, order id, deploy id) na §9.  
5. Proibido abrir Parceiros / Garage rica / WA agentic / boleto checkout neste plano.

Ciclo: **Auditar → Autorizar → Fazer → Testar → Registrar → Gate**.

---

## 1. Estado da execução (quadro de comando)

| Frente | Status | Bloqueia |
|--------|--------|----------|
| **P0** Alinhamento pay/deploy | **PASS** (front tip = **draft**; prod Forbidden) · [VAL](./FAL_MARCHA_P0_ALINHAMENTO_PAY_VAL_2026-11-16.md) | — |
| G1 Produto/fitment | **PASS** · [VAL](./FAL_MARCHA_G1_PRODUTO_FITMENT_VAL_2026-11-16.md) | — |
| G2 Preço/vitrine | **PASS** · [VAL](./FAL_MARCHA_G2_PRECO_VITRINE_VAL_2026-11-16.md) | — |
| G3 Checkout/pay | **PASS** · [VAL](./FAL_MARCHA_G3_CHECKOUT_PAY_VAL_2026-11-16.md) | — |
| G4 Frete | **PASS** · [VAL](./FAL_MARCHA_G4_FRETE_ENTREGA_VAL_2026-11-16.md) | — |
| G5 Ops | **PASS** · [VAL](./FAL_MARCHA_G5_OPS_VAL_2026-11-16.md) | — |
| G6 Jurídico/pós-venda | **PASS** · [VAL](./FAL_MARCHA_G6_JURIDICO_POSVENDA_VAL_2026-11-16.md) WA preview `6afb53c8…` | — |
| G7 E2E | **PASS** · [VAL](./FAL_MARCHA_G7_E2E_ESTABILIDADE_VAL_2026-11-16.md) | — |
| G8 Venda controlada | **BLOCKED — STOP 8.3** · [VAL](./FAL_MARCHA_G8_VENDA_CONTROLADA_VAL_2026-11-16.md) | — |

**Próxima ação única (MARCHA):** **G8.3 validação total** — N=3 no preview (1+ approve real + ops se possível; smoke cartão já parcial) **ou** créditos/`--prod`. Depois 8.4 monitor. Rollback: [plano](./FAL_MARCHA_G8_ROLLBACK_PLAN_2026-11-16.md).

---

## 2. Regras STOP (válidas para todas as frentes)

| STOP se… | Motivo |
|----------|--------|
| Front aponta Edge/SQL que não está no remoto | Cobrança/UX quebrada |
| `asaas_enabled=false` e teste exige Asaas | 503 / cartão/PIX>201 falha |
| Smoke pay cria cobrança duplicada | Risco financeiro |
| Carrier mock usado como “enviado” | Mentira operacional |
| MARCHA sem classe MVP-bloqueador / Evolução / Futuro | Remendo |
| Mudança toca pay/frete/pedido sem regressão mínima | Regressão silenciosa |

**Preservar sempre:** `place_order` · PVC · `resolve_product_price` · hub pedidos/RPCs · `paymentRouter` · `customer_vehicles`.

---

## 3. P0 — Alinhamento operacional (FAZER AGORA)

### Problema (FATO)

Working tree tem pay Asaas cartão embutido, condição %, Edges e migração **não no tip** `4e7fab19`. Front local pode assumir contrato que produção não tem.

### Escopo / fora

| Inclui | Exclui |
|--------|--------|
| Inventariar WT pay/notif | Feature Parceiros |
| Decidir commit vs stash por pacote | Redesign checkout |
| Migration `20261116140000_store_payment_condition_adjust.sql` | Boleto |
| Deploy Edges + Netlify alinhados | Garage rica |
| Confirmar `payment_routing_config.asaas_enabled` + secrets | — |

### Passos assertivos

| # | Passo | Como | PASS se | FAIL se |
|---|-------|------|---------|---------|
| **0.1** | Inventário WT | Separar 3 pacotes: (A) pay Asaas cartão+Edges+shared (B) condição % vitrine+migration (C) notificações mobile UI | Lista A/B/C escrita no VAL | Mistura sem dono |
| **0.2** | Autorização eFe | eFe diz: commit A? B? C? migrate? deploy? | OK escrito | Sem OK → STOP |
| **0.3** | Testes locais pacote A | `cd fal-pecas && npm test` focando pay (`paymentRouter`, asaas*, createFal*) | Suite pay PASS | Teste vermelho |
| **0.4** | Commit(s) limpos | Commits por pacote; **não** commitar `.deploy-*.json` nem secrets | Tip contém A/B/C aprovados | Secrets no git |
| **0.5** | Migration | Aplicar `fal-pecas/supabase/migrations/20261116140000_store_payment_condition_adjust.sql` no projeto correto | SQL applied | Drift |
| **0.6** | Deploy Edges | `create-fal-payment`, `pay-asaas-credit-card`, `asaas-webhook`, `create-asaas-payment`, shared | Versões batem com tip | Edge velha |
| **0.7** | Flags/secrets | Confirmar nomes: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_ENV`, `MP_*`; **ler** `payment_routing_config` (`asaas_enabled`, `pix_mp_max_amount_cents=20100`) | Asaas on se cartão/PIX>201 | Flag off sem decisão |
| **0.8** | Redeploy Netlify + smoke create | Build tip; smoke Pix create (≤201 MP e >201 Asaas se on); cartão create **sem** forçar approve ainda | Create OK; UI não 404 Edge | UI local ≠ prod |

**Arquivos-âncora P0**

- `fal-pecas/src/services/payments/routing/paymentRouter.ts`  
- `fal-pecas/src/services/payments/falPayCapabilities.ts`  
- `fal-pecas/supabase/functions/create-fal-payment/`  
- `fal-pecas/supabase/functions/pay-asaas-credit-card/`  
- `fal-pecas/supabase/migrations/20261116140000_store_payment_condition_adjust.sql`  
- `fal-pecas/src/pages/Checkout/CheckoutPage.tsx`  

**Gate P0:** tip = Edges = SQL = front prod · checklist env preenchido · smoke **create** Pix (e cartão se pacote A shipped) PASS.  
**Saída:** VAL `FAL_MARCHA_P0_ALINHAMENTO_PAY_VAL_YYYY-MM-DD.md`.

---

## 4. G1 — Produto / fitment

**Pré-condição:** P0 PASS (ou só prep de dados se não tocar front pay).

| # | Passo | PASS se |
|---|-------|---------|
| 1.1 | Amostrar N SKUs published com PVC (eFe define N, sugerido ≥20 críticos) | Lista SKU↔apps |
| 1.2 | Confirmar `search_products` com year range PVC no **projeto prod** | Query ano intervalo ok |
| 1.3 | Smoke: placa → confirmar → `/catalogo` com maker/model/year | Resultados coerentes |
| 1.4 | Smoke: NL/`q=modelo ano` reescreve filtros | URL canônica |
| 1.5 | Indisponível não compra (modo com_estoque) | Bloqueio UI+backend |
| 1.6 | Remover ou ignorar `vehicle=1` morto (ajuste fino) | Sem efeito colateral |

**Não fazer:** Garage rica; redesign completo busca.  
**Gate G1:** eFe assina amostra comercial + smokes 1.3–1.5.

---

## 5. G2 — Preço / vitrine

| # | Passo | PASS se |
|---|-------|---------|
| 2.1 | Mesmo produto: card = PDP = cart = checkout = `order_items.unit_price` | 5 pontos iguais (ou diferença só por regra % documentada) |
| 2.2 | UI só exibe preço via resolve / hydrate | Não “confiar” só em `products.price` |
| 2.3 | Condições vitrine (% Pix/cartão) alinhadas ao `apply_payment_condition_to_order` **se** B shipped | Sem engolir erro silencioso |
| 2.4 | Home/destaques/promo não mostram preço mentiroso | Smoke home |

**Gate G2:** planilha/print dos 5 pontos + eFe.

---

## 6. G3 — Checkout / pagamento

**Pré-condição:** P0 PASS obrigatório.

| # | Passo | PASS se |
|---|-------|---------|
| 3.1 | Pix ≤ R$ 201 → MP create + webhook/sync approved | Pedido `pagamento_aprovado`/`recebido` path |
| 3.2 | Pix > R$ 201 → Asaas (se enabled) | Idem |
| 3.3 | Cartão Asaas create (crédito embutido se shipped) | Payment pending/approved coerente |
| 3.4 | Recusa / cancel unpaid | Pedido **não** segue como pago |
| 3.5 | Double-submit / retry | Sem cobrança duplicada (`idempotency`) |
| 3.6 | Timeout Asaas | `inconclusive`/reconcile; sem “pago mentiroso” |

**Não fazer:** boleto checkout; split.  
**Gate G3:** cenários 2–4 do MVP E2E PASS com ids de pedido/payment registrados.

---

## 7. G4 — Frete / entrega

| # | Passo | PASS se |
|---|-------|---------|
| 4.1 | SKUs do smoke têm weight/dims | Sem `missing_dims` no ME |
| 4.2 | Cotação carrinho = conjunto (caixa ou regra clara) | Quote no checkout selecionável |
| 4.3 | Own: provisional ≠ place_order | Só `ownq:` válido fecha |
| 4.4 | Etiqueta ME purchase → **depois** `ship_order` | Status `enviado` só via RPC |
| 4.5 | Cliente vê rastreio em `/conta/pedidos/:id` | Link/código visível |

**Gate G4:** um pedido pago → enviado com rastreio (id registrado).

---

## 8. G5 — Operação

| # | Passo | PASS se |
|---|-------|---------|
| 5.1 | Pedido pago aparece em análise/separação | Fila correta |
| 5.2 | Separação item + complete → pronto_para_envio | Só via RPC |
| 5.3 | Estoque/reserva coerente com modo loja | Sem vender saldo negativo indevido |
| 5.4 | Margem/custo visível no detalhe (mínimo MVP) | Operador vê |

**Gate G5:** smoke ops rotina documentado (operador ou eFe).

---

## 9. G6 — Segurança / jurídico / pós-venda mínimo

| # | Passo | PASS se |
|---|-------|---------|
| 6.1 | Termos/privacidade/trocas acessíveis e versionados | Links footer/checkout |
| 6.2 | Cancel unpaid + request cancel + confirm receipt + report issue | Paths cliente OK |
| 6.3 | RLS: cliente não lê pedido alheio | Negado |
| 6.4 | Backup recente antes de limpeza 001 | Evidência backup |
| 6.5 | Canal atendimento humano (WhatsApp link ou inbox) | Contato claro |

**Não fazer:** RMA completo; WA agentic.  
**Gate G6:** eFe (+ advogado se textos finais).

---

## 10. G7 — Estabilidade

| # | Passo | PASS se |
|---|-------|---------|
| 7.1 | Rodar 14 cenários E2E do MVP Completo §5 | PASS documentado por cenário |
| 7.2 | Mobile: checkout + inbox + catálogo | Sem corte crítico |
| 7.3 | KPIs dashboard mínimos | Visíveis |
| 7.4 | Limpeza órfãos (`OrdersPage`, placeholder) **só se** estável | Sem regressão |

**Gate G7:** matriz 14 cenários anexada.

---

## 11. G8 — Comercialização controlada

| # | Passo | PASS se |
|---|-------|---------|
| 8.1 | Checklist G1–G7 = PASS | Quadro §1 verde |
| 8.2 | Plano rollback (pay off / maintenance) | Escrito |
| 8.3 | N primeiras vendas reais (eFe define N, sugerido 3–5) | Sem incidente P0 |
| 8.4 | Monitor 48–72h | Log/inbox/pay ok |

**Gate G8:** eFe declara loja aberta para venda controlada.

---

## 12. Ordem rígida

```text
P0
 ↓
G1 ──┬── G2   (após P0; dados G1 podem iniciar antes se não deploy pay)
     ↓
    G3
     ↓
    G4
     ↓
    G5
     ↓
G6 (pode adiantar textos em paralelo)
     ↓
    G7
     ↓
    G8
```

**Proibido:** pular P0; misturar Parceiros no meio; “só mais uma feature” sem classe MVP-bloqueador.

---

## 13. Registro de progresso

| Frente | Data | Status | Evidência (VAL / ids) | Responsável |
|--------|------|--------|------------------------|-------------|
| P0 | 2026-11-16 | **PASS** | [VAL](./FAL_MARCHA_P0_ALINHAMENTO_PAY_VAL_2026-11-16.md) draft `6afb46f5…` tip · Edges create PASS · prod Forbidden (dívida) | eFe |
| G1 | 2026-11-16 | **PASS** | [VAL](./FAL_MARCHA_G1_PRODUTO_FITMENT_VAL_2026-11-16.md) 100/100 PVC · placa FRW0E37 · NL HB20 2015 · SK971 indisponível | eFe |
| G2 | 2026-11-16 | **PASS** | [VAL](./FAL_MARCHA_G2_PRECO_VITRINE_VAL_2026-11-16.md) BRD2109 61,45 em 5 pontos · fix PDP hooks #310 · draft `6afb4b44…` | eFe |
| G3 | 2026-11-16 | **PASS** | [VAL](./FAL_MARCHA_G3_CHECKOUT_PAY_VAL_2026-11-16.md) Pix create+idem+sync · card Asaas · cancel unpaid · router >201 unit | eFe |
| G4 | 2026-11-16 | **PASS** | [VAL](./FAL_MARCHA_G4_FRETE_ENTREGA_VAL_2026-11-16.md) dims 100/100 · cotação draft CEP 01310-100 · ownq gates · pedido `9619a86c…` enviado `SMOKE-C7-OWN` | eFe |
| G5 | 2026-11-16 | **PASS** | [VAL](./FAL_MARCHA_G5_OPS_VAL_2026-11-16.md) trail `dcb929db…` até `pronto_para_envio` · `sem_estoque` · margem admin | eFe |
| G6 | 2026-11-16 | **PASS** | [VAL](./FAL_MARCHA_G6_JURIDICO_POSVENDA_VAL_2026-11-16.md) WA `+5511992935688` preview `6afb53c8…` | eFe |
| G7 | 2026-11-16 | **PASS** | [VAL](./FAL_MARCHA_G7_E2E_ESTABILIDADE_VAL_2026-11-16.md) matriz 14 · own out_of_coverage live · preview catálogo | eFe |
| G8 | 2026-11-16 | **BLOCKED** | [VAL](./FAL_MARCHA_G8_VENDA_CONTROLADA_VAL_2026-11-16.md) 8.1–8.2 PASS · 8.3–8.4 eFe · `--prod` Forbidden | eFe |

Modelo de VAL: `docs/planejamento/FAL_MARCHA_<FRENTE>_VAL_YYYY-MM-DD.md` com PASS/FAIL por passo.

---

## 14. Decisões humanas já listadas (não inventar no código)

| ID | Decisão | Antes de |
|----|---------|----------|
| D-ASAAS | Ligar `asaas_enabled`? | P0.7 / G3 |
| D-DEPLOY-PAY | Ship pacotes A/B/C? | P0.2 |
| D-G3-SMOKE | Valores reais de teste | G3 |
| D-G4-ME | Conta ME / etiqueta prod | G4 |
| D-G6-LEGAL | Textos finais | G6 |
| D-G8 | Abrir venda + N | G8 |
