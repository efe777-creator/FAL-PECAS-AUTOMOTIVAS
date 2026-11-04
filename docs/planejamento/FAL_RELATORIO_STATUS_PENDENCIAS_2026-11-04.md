# Relatório completo — status, pendências e próximos passos

**Data/hora:** 2026-11-04 (pós M3–M5)  
**Loja:** https://fal-pecas-automotivas.netlify.app  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**main tip:** `23e67f1` (merge #52 — regras Onda 1)  
**Fontes:** [PRD §7/§20–23/§31/§32/§36](../entrada/FAL_PRD_3.0.md) · [ROADMAP](./ROADMAP_FASES_3.0.md) · [auditoria](./FAL_AUDITORIA_COMPLETA_PENDENCIAS_2026-11-04.md) · [backlog](./FAL_BACKLOG_POS_ALPHA_2026-11-04.md) · [regras pedidos](./FAL_REGRAS_FLUXO_PEDIDOS_2026-11-04.md) · [STOP α](./FAL_STOP_ALPHA_FORMAL_2026-11-04.md) · probe wtbp

---

## 1. Contexto (onde estamos)

| Camada | Estado |
|--------|--------|
| **Fase α** | **ENCERRADA** — Gate SIM · D-FRETE **B** · smoke MP PASS loja · E2E pago `08da5ada…` · STOP formal |
| **Foco atual (PRD §7 / ROADMAP D+)** | Pós-α: regras de pedidos · logística/dados · ops · frete live só com nova assinatura |
| **Política frete** | **B** (mock/sandbox + aviso). Live / Melhor Envio / **C** = fora até assinatura |
| **Pagamento** | Gateway = verdade. Operador **não** aprova. Cartão salvo = Onda 3 (token MP, sem PAN/CVV) |

A plataforma comercial controlada **já opera**. O que falta é fechar gaps de regras cliente, dados logísticos, ciclo operador até entrega e decisões de frete/escala.

---

## 2. FEITO e operacional

### Base (PRD CONCLUÍDO)
F1–F8.1 · F10 Onda 0–1 · FIND-004 · F9-E/F9-F · PDP/Card · checkout MP · operação F7 (recepção→entrega no SQL).

### Pós-α já em produção / wtbp

| Entrega | Evidência |
|----------|-----------|
| Logística: hub, origem, frete próprio config (`enabled=false`), medidas + bulk | #45 |
| Produtos: alterações globais + cascata Categoria/Grupo/Subgrupo/Situação | #46 |
| Expiry 48 h (RPC + botão admin) | #48 |
| UX admin confirmação → separação | #49/#50 |
| Docs α + PRD/ROADMAP + regras canônicas | #51 (M3) |
| Regras Onda 1: cancelar não pago, Autorizar/Recusar, labels | #52 (M4) · SQL wtbp |
| `pg_cron` horário + 9 pedidos expirados + CHECK `payments` c/ `expired` | **wtbp FEITO** · PR **#53 aberto** (M5) |
| Retomar pagamento, carrinho sync, lightbox | main |

### PRs abertos (deploy pendente)

| PR | Conteúdo |
|----|----------|
| [#53](https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS/pull/53) | Migrations/docs `pg_cron` + align payments (já aplicados no wtbp) |
| [#54](https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS/pull/54) | UI: remove label Zoom/Ampliar (mantém lightbox) |

---

## 3. Runtime agora (probe)

| Medida | Valor |
|--------|-------|
| `aguardando_pagamento` | **6** (< 48 h) |
| `cancelado` | **9** (limpeza M5) |
| `pronto_para_envio` | **1** (`08da5ada…`) |
| Published disponíveis | 99 |
| Published **sem peso** | **98** |
| Cron `fal-expire-unpaid-orders` | **ativo** `15 * * * *` |

---

## 4. Cruzamento PRD × FATO × GAP

| PRD | FATO | GAP |
|-----|------|-----|
| §7 α / smoke / D-FRETE | α encerrada; smoke PASS; B assinado | Docs syncados (#51). PRD “EM EXECUÇÃO” ainda lista Onda 1/cron — atualizar pós merge #53 |
| §20 Pedidos ciclo F7 | Admin operacional até pronto/envio | Pedido âncora ainda em `pronto_para_envio` (M7) |
| §20 / regras: cancel pré-pago + autorização | **Onda 1 FEITA** (#52) | Smoke humano cancel/autorizar |
| Regras: cancel pós-pago | Ausente | **Onda 2 (M8)** + política de estorno |
| §22 Pagamentos / cartão salvo | Approve via gateway OK | **Onda 3 (M10)** — decisão seguir/adiar |
| §22 ressalva webhook MCP | Approve loja OK | Diagnóstico `notifications_history` (M9) |
| §23 Frete | B + frete próprio off + medidas UI | **98 sem peso (M6)**; live = C/ME (M11+) |
| §28 Testes E2E contínuo | Smoke pontuais | Automatizar regressão (P1-TEST) |
| §31 Lacunas / §36 pendentes | Lista atualizada no PRD | Estorno · cartão · taxonomia · D-SCHEMA |
| §32 F11–F13 | Planejado/Futuro | Não iniciar sem gate pós-α |

---

## 5. Regras de pedidos (canônico) × onda

| Regra | Estado |
|-------|--------|
| Fluxo 1–8 loja | Operacional admin |
| Cancelar / “editar” pré-pagamento (cancel→carrinho) | **Onda 1 FEITA** |
| Autorização indisponível/prazo | **Onda 1 FEITA** |
| Labels comerciais cliente | **Onda 1 FEITA** |
| Retomar Pix/cartão | Operacional |
| Aprovação só gateway | Operacional |
| Solicitação cancel pós-pago + análise | **PENDENTE Onda 2** |
| Cartão tokenizado no perfil | **PENDENTE Onda 3** |

---

## 6. Pendências priorizadas (o que falta)

### Imediato (hoje)
1. **Merge #53 e #54** → main/Netlify alinhados ao wtbp + UI Zoom limpa.  
2. **M6 DADOS-MEDIDAS** — bloquear: eFe informar pesos/dims por Categoria/Grupo (98 SKUs). Sem isso frete real/próprio fica cego.  
3. **M7 OPS-E2E** — levar `08da5ada` a `enviado`/`entregue` (smoke operador completo).

### Próximo (código + decisão)
| ID | Item | Bloqueio |
|----|------|----------|
| M8 / P1-REG2 | Cancel pós-pago + refund MP | Política de estorno (auto vs manual; prazo) |
| M9 / P1-WH | Diagnóstico webhook MCP | Opcional (ressalva α) |
| M10 / P1-REG3 | Cartão salvo tokenizado | Seguir ou adiar |
| P1-LOG-HIST | Histórico mudanças de medidas | Após M6 |
| P1-TEST | E2E contínuo (PRD §28) | Capacidade |

### Depois (assinatura / escala)
| ID | Item |
|----|------|
| P2-OWN | Critérios preço frete próprio + `enabled=true` |
| P2-ME / P2-C | Melhor Envio / D-FRETE **C** — **nova assinatura** |
| P3-F11 | Catálogo mestre |
| P3-DOM | Domínio definitivo |
| P3-HOLD | B3 / Bloco F / PDP-ML |

---

## 7. Sequência de MARCHAs

| # | MARCHA | Status |
|---|--------|--------|
| M3 | Docs sync pós-α | **FEITO** #51 |
| M4 | Regras Onda 1 | **FEITO** #52 |
| M5 | `pg_cron` expiry | **FEITO wtbp** · merge **#53** |
| — | Fix Zoom label | merge **#54** |
| **M6** | **Dados medidas/peso** | **PRÓXIMA** (valores eFe) |
| M7 | Ops E2E entrega `08da5ada` | Em seguida |
| M8 | Regras Onda 2 | Decisão estorno |
| M9 | Webhook diag | Opcional |
| M10 | Regras Onda 3 | Seguir/adiar |
| M11+ | Frete C / ME · F11 · domínio | Assinaturas |

---

## 8. Decisões humanas em aberto

1. **Valores de peso/dimensão** por grupo (desbloqueia M6).  
2. **Política de estorno** no cancel pós-pago (M8).  
3. **Cartão salvo:** implementar agora ou adiar (M10).  
4. **Assinar D-FRETE C / Melhor Envio** quando quiser sair do mock.  
5. Taxonomia / autoridade de campos (PRD §36) antes de F11/F12.

---

## 9. Veredicto

**Operação controlada está de pé.** Docs e PRD já descrevem α encerrada e foco pós-α.  
Gaps críticos restantes: **dados de medidas (98 SKUs)**, **fechar ciclo do pedido âncora**, **Onda 2/3 de regras** (com decisões), **frete live** (assinatura).  
**Próximo passo prático:** merge #53/#54 → M6 (você passa os padrões de peso) ou M7 (smoke entrega) se preferir ops antes de dados.
