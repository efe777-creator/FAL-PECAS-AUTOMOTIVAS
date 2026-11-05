# Auditoria completa — pendências × PRD × regras definidas

**Data:** 2026-11-04  
**Runtime:** `wtbpwuiayednvlhvuhbh` · **Loja:** https://fal-pecas-automotivas.netlify.app  
**main / Netlify:** `7c257bc` (PR #50)  
**Fontes cruzadas:** PRD 3.0 (`docs/entrada/FAL_PRD_3.0.md` §7/§20–23/§31/§32/§36) · [ROADMAP](./ROADMAP_FASES_3.0.md) · [Backlog pós-α](./FAL_BACKLOG_POS_ALPHA_2026-11-04.md) · [Estado final α](./FAL_ESTADO_FINAL_ALPHA_2026-11-04.md) · VALs 04/11 · regras de fluxo de pedidos (eFe, 04/11) · probes read-only wtbp.

---

## 1. Evidência de runtime (probe read-only 04/11)

| Medida | Valor |
|--------|-------|
| Pedidos `aguardando_pagamento` | 15 (payments `pending` 15) |
| …destes com > 48 h | **9** — não expiraram (sem agendamento) |
| Pedidos `pronto_para_envio` | 1 (`08da5ada…`, payment `approved`) |
| Produtos `published` | 100 (99 disponíveis, 1 indisponível) |
| Published sem imagem | 0 |
| Published sem peso | **98** |
| Categorias (`product_categories`) | 55 |
| RPCs presentes | `place_order`, `confirm_mercadopago_payment`, `finalize_order_confirmation`, `complete_order_separation`, `ship_order`, `deliver_order`, `expire_unpaid_orders` |
| RPCs ausentes | `customer_cancel_unpaid_order`, `customer_respond_order_decision`, `request_order_cancellation` |
| Extensões `pg_cron` / `pg_net` | **ausentes** |
| Edge Functions (repo) | `create-mp-payment`, `mercado-pago-webhook`, `quote-shipping` |

---

## 2. FEITO e operacional (em produção)

| Área | Entrega | Evidência |
|------|---------|-----------|
| Base F1–F8.1 | Loja, conta, checkout, pedidos F7, estoque, clientes, import/custo/preço, liberação | PRD §7 |
| F10 Onda 0–1 / FIND-004 | Schema-first, IMPs, apps PVC | ROADMAP |
| Pagamento | F9-E webhook hardening, F9-F meios MP, Card Brick estável (#44), smoke Pix/cartão **PASS loja** | VAL S2 approve |
| Fase α | Gate **SIM** + D-FRETE **B** + E2E pago `08da5ada` + STOP formal | Estado final α |
| Logística | Hub, origem/remetente, frete próprio (config, `enabled=false`), medidas c/ origem por campo + bulk | PR #45 · VALs logística |
| Produtos | Alterações globais, filtros Categoria/Grupo/Subgrupo, Situação | PR #46 |
| Pedidos | Expiry 48 h (RPC + botão admin), UX operador confirmação → separação, retomar pagamento (cliente), carrinho sincronizado, lightbox | PR #48/#49/#50 |

---

## 3. Divergências de documentação (corrigir)

| # | Divergência | Ação |
|---|-------------|------|
| DOC-1 | Docs de fechamento α (Gate, D-FRETE, E2E, MP smoke, planejamento, soberano…) **assinados só na árvore local** — main ainda mostra "PENDENTE" | Commit/PR de docs |
| DOC-2 | PRD §7/§22/§23/§31/§32/§36 tratam α como **foco atual**, smoke **pendente** e D-FRETE **sem assinatura** | Sync PRD (P1-DOC) |
| DOC-3 | ROADMAP Bloco C "smoke PENDENTE"; Bloco D "foco α" | Sync ROADMAP |
| DOC-4 | `FAL_AUDITORIA_STATUS_PRD_CROSS_2026-11-04` pré-fechamento | Marcar superado → este doc |
| DOC-5 | Regras de fluxo de pedidos (eFe) só no chat/plano — sem doc canônico | Criar `FAL_REGRAS_FLUXO_PEDIDOS_2026-11-04.md` |

---

## 4. Regras de pedidos definidas × implementação

| Regra (eFe) | Estado | Gap |
|-------------|--------|-----|
| Fluxo 1–8 (pago → recebido → análise → confirmação → separação → pronto → enviado → entregue) | **Operacional** (admin) | Labels comerciais p/ cliente |
| Antes do pagamento: cliente edita/cancela | **Parcial** — expiry automático só manual | RPC `customer_cancel_unpaid_order` + UI; edição = recriar carrinho |
| Após pagamento: só solicitação, sujeita a análise; histórico preservado | **Ausente** | Onda 2: `request_order_cancellation` + fila admin |
| Indisponibilidade → autorização do cliente | **Ausente lado cliente** (status `aguardando_decisao` existe) | RPC `customer_respond_order_decision` + UI cliente/admin |
| Confirmação geral da loja | **Operacional** (`finalize_order_confirmation`) | — |
| Acesso rápido ao pagamento (Pix QR / cartão) | **Operacional** (retomar pagamento) | Revalidar QR expirado |
| Aprovação só via gateway (operador não aprova) | **Operacional** (webhook/`confirm_mercadopago_payment`) | Diagnóstico MCP `notifications_history` (ressalva) |
| Cartão salvo tokenizado (MP Customer/Card; FAL guarda só token + bandeira + últimos 4) | **Ausente** | Onda 3 — exige decisão + MP Customers API |

---

## 5. Pendências priorizadas

### P0 — fechar o que já está "quase operacional"

| ID | Item | Por quê | Tipo |
|----|------|---------|------|
| P0-DOCS | Commit dos docs α + sync PRD/ROADMAP + doc regras pedidos | Main contradiz o estado real | Docs |
| P0-CRON | Agendar `expire_unpaid_orders` | 9 pedidos > 48 h segurando reserva | Infra (pg_cron ou Netlify Scheduled Function / GitHub Action) — **decisão** |
| P0-REG1 | Onda 1 regras pedidos: cancelar não pago (cliente), decisão de indisponibilidade, labels/CTAs | Regra definida sem implementação | SQL + UI |
| P0-MED-DADOS | Preencher peso/medidas (98/100 sem peso) via bulk global | Pré-requisito de qualquer frete real | Operação/dados |

### P1

| ID | Item |
|----|------|
| P1-REG2 | Onda 2: solicitação de cancelamento pós-pagamento + análise admin + estorno MP (refund) | **FEITO** 05/11 código — estorno **manual** · [VAL M8](./FAL_MARCHA_PEDIDOS_REGRAS_ONDA2_VAL_2026-11-05.md) |
| P1-WH | Diagnóstico webhook (`notifications_history`) | **FEITO** 05/11 — MCP vazio (ressalva) · Edge 405 GET · [VAL M9](./FAL_MARCHA_M9_WEBHOOK_DIAG_VAL_2026-11-05.md) |
| P1-OPS-E2E | Concluir `08da5ada` até `enviado`/`entregue` | **FEITO** 05/11 — `entregue` |
| P1-LOG-HIST | Histórico de alterações de medidas (`MARCHA_LOGISTICA_FILTROS_HISTORICO_MEDIDAS`) |
| P1-TEST | E2E contínuo (PRD §28) — regressão admin/cliente automatizada |

### P2

| ID | Item |
|----|------|
| P2-REG3 | Onda 3: cartão salvo tokenizado (MP Customers/Cards) — regra de segurança eFe obrigatória |
| P2-OWN | Frete próprio v2 distance+POL+ownq | **FEITO** 05/11 — cutover `enabled=true` · tarifas homolog (eFe edita no admin) · VAL/auditoria |
| P2-ME / P2-C | Melhor Envio / D-FRETE **C** — só com nova assinatura |

### P3

F11 catálogo mestre · domínio definitivo · F12/F13 · HOLD (B3, Bloco F permissões granulares, PDP-ML).

---

## 6. Sequência de MARCHAs proposta

| Ordem | MARCHA | Conteúdo | Gate |
|-------|--------|----------|------|
| M3 | DOCS-SYNC-POS-ALPHA | PR com docs α locais + PRD §7/§22/§23/§31/§32/§36 + ROADMAP + `FAL_REGRAS_FLUXO_PEDIDOS` | **FEITO** #51 |
| M4 | REGRAS-PEDIDOS-ONDA1 | cancelar não pago, decisão cliente, labels/CTAs | **FEITO** SQL wtbp + VAL + PR |
| M5 | CRON-EXPIRY | `pg_cron` + 1ª limpeza dos 9 | **FEITO** (job horário + 9 expirados) |
| M6 | DADOS-MEDIDAS | Bulk peso/dimensões por Categoria/Grupo | **FEITO** provisório 04/11 (100 quote-ready); calibração comercial = eFe |
| M7 | OPS-E2E-ENTREGA | Levar `08da5ada` a entregue; VAL do ciclo completo | **FEITO** 05/11 — status `entregue` · [VAL](./FAL_MARCHA_OPS_E2E_ENTREGA_VAL_2026-11-05.md) |
| M8 | REGRAS-PEDIDOS-ONDA2 | Cancelamento pós-pago + refund MP | **FEITO** 05/11 — estorno **manual** provisório · [VAL](./FAL_MARCHA_PEDIDOS_REGRAS_ONDA2_VAL_2026-11-05.md) |
| M9 | WEBHOOK-DIAG | MCP `notifications_history` / logs Edge | **FEITO** 05/11 — [VAL](./FAL_MARCHA_M9_WEBHOOK_DIAG_VAL_2026-11-05.md) · MCP ainda vazio (≠ FAIL loja) |
| M10 | REGRAS-PEDIDOS-ONDA3 | Cartão tokenizado | Decisão + MP Customers |
| M11+ | Frete C / Melhor Envio · F11 · domínio | — | Assinaturas |

---

## 7. Decisões humanas pendentes

1. ~~Mecanismo do cron~~ — **`pg_cron`** FEITO (job `fal-expire-unpaid-orders` · `15 * * * *`).
2. ~~**Política de estorno** (Onda 2)~~ — **MANUAL** provisório (M8 05/11); auto-refund = marcha futura.
3. **Valores padrão de medidas** por grupo (para o bulk M6).
4. **Cartão salvo** (Onda 3): seguir ou adiar.
5. Taxonomia/autoridade de campos (PRD §36.3–4) — antes de F11/F12.
