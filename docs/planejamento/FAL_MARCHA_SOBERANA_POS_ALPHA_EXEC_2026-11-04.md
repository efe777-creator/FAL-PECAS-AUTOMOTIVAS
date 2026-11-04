# MARCHA SOBERANA pós-α — execução (04/11)

**Tipo:** runbook soberano (evidência + STOP)  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Loja:** https://fal-pecas-automotivas.netlify.app  
**Premissa:** α ENCERRADA · D-FRETE **B** · ME híbrido D12 em `main` (#57) · UX M0 em `main` (#59)  
**α histórico:** [FAL_MARCHA_SOBERANA_ALPHA_EXEC_2026-11-04.md](./FAL_MARCHA_SOBERANA_ALPHA_EXEC_2026-11-04.md)

---

## Sequência desta soberana

| Step | Item | Estado | Evidência |
|------|------|--------|-----------|
| S0 | Tip `main` + loja | **PASS** | `e368b87` (#59) · bundle prod `assets/index-Cd9ADn7G.js` · HTTP 200 |
| S1 | Schema ME híbrido wtbp | **PASS** | `shipping_quotes` + `melhorenvio_webhook_events` presentes |
| S1b | Origem expedição | **PASS** | `store_shipping_origin` Guarulhos/SP CEP `07124543` |
| S2 | Secrets `MELHOR_ENVIO_*` | **FAIL / AUSENTE** | CLI secrets list wtbp: **sem** `MELHOR_ENVIO_TOKEN` / `USER_AGENT` / `WEBHOOK_SECRET` (MP_* presentes) |
| S3 | M6 medidas quote-ready | **BLOQUEADO** | published **100** · com peso **2** · **quote_ready 0** (dims null) · sem peso **98** |
| S4 | M9 webhook MP MCP | **NÃO OBSERVADO** | App `8320396999442614` · `notifications_history` vazio (igual ressalva Gate) |
| S5 | Default checkout ME | **HOLD** | Mantém mock até decisão / D-FRETE C — **não** alterar nesta soberana |

---

## SKUs com peso (ainda sem dims)

| SKU | weight_kg | dims |
|-----|-----------|------|
| TDI1101 | 7.700 | height/width/length **null** |
| BRD6408 | 7.700 | height/width/length **null** |

Cotação ME real exige peso **e** dimensões → **0** SKUs quote-ready.

---

## O que o agente NÃO pode fechar sozinho

1. Colar `MELHOR_ENVIO_TOKEN` + `MELHOR_ENVIO_USER_AGENT` no Edge (sandbox).  
2. Preencher medidas (M6) — valores comerciais eFe.  
3. Smoke E2E etiqueta purchase (saldo carteira sandbox).  
4. Trocar `VITE_SHIPPING_PROVIDER=melhorenvio` em Netlify (opt-in explícito).

---

## Próxima MARCHA nomeada (fila)

| # | Nome | Gate |
|---|------|------|
| 1 | `M-ME-SEC` | eFe cola secrets sandbox |
| 2 | `M6` | eFe envia peso+dims (mín. 1 SKU smoke; ideal por grupo) |
| 3 | `M7` | Smoke Central → Expedição → label ME (pós 1+2) |
| 4 | `M9` | Webhook MP diag (MCP vazio ≠ FAIL loja) |

---

## STOP

Soberana pós-α **fechada em evidência**. Código ME + migration + Edges + M0 UX **ok**. Bola humana: **secrets ME** + **medidas**.

**Assinatura agente:** MARCHA SOBERANA pós-α STOP 2026-11-04.
