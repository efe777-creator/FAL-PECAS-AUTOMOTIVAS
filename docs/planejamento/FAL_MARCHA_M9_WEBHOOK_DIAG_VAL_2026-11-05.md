# VAL — M9 WEBHOOK-DIAG

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**App MP sandbox:** `FALPecasSandbox` · `8320396999442614`  
**Endpoint:** `https://wtbpwuiayednvlhvuhbh.supabase.co/functions/v1/mercado-pago-webhook`

---

## Escopo

Revalidar diagnóstico de entrega de webhooks MP (MCP `notifications_history`) vs evidência de approve na loja / Edge ativo.

---

## Evidências (FATO — 05/11)

| # | Check | Resultado | Evidência |
|---|-------|-----------|-----------|
| 1 | App MCP | **PASS** | `application_list` → 1 app `8320396999442614` |
| 2 | MCP `notifications_history` | **NÃO OBSERVADO** | “No Notifications Found” (igual S2 04/11 e Soberana) |
| 3 | Edge `mercado-pago-webhook` | **PASS (vivo)** | GET → **HTTP 405** Method Not Allowed (rota ativa; espera POST) |
| 4 | Approve loja (histórico) | **PASS** | Pedido `08da5ada…` · `approved` · S2 VAL 04/11 · ciclo M7 → `entregue` 05/11 |
| 5 | Logs Edge via Supabase MCP | **N/A neste agente** | MCP Supabase autenticado só em `owllm…` (HF) — **não** no canônico `wtbp` |

---

## Veredicto M9

| Critério | Status |
|----------|--------|
| Diagnóstico MCP history | **PARCIAL** — tool sem entregas listadas |
| Edge webhook deploy/rota | **PASS** (405 em GET) |
| Pagamento real na loja | **PASS** (não depende do MCP history) |
| Gap MCP = FAIL webhook loja? | **NÃO** — ressalva de **telemetria MCP**, não de operação |

**Conclusão:** P1-WH / M9 **fechados como diagnóstico**. Persistência do “No Notifications Found” no MCP **não** autoriza reabrir smoke S2 nem alterar `save_webhook` sem ordem explícita do eFe.

---

## STOP

Não chamar `save_webhook` nem redeploy Edge nesta marcha.  
Próximo sequencial: **M8** (política de estorno) · calibração comercial medidas (eFe) · merge **PR #66** frete próprio.

**Assinatura agente:** VAL M9 WEBHOOK-DIAG 2026-11-05.
