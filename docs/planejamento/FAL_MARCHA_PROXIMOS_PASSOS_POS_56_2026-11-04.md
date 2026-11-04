# MARCHA — Próximos passos (pós PR #56 → sync soberana 04/11)

**Data:** 2026-11-04  
**main tip:** `e368b87` (merge #59 UX zoom/toast)  
**Loja:** https://fal-pecas-automotivas.netlify.app · bundle `assets/index-Cd9ADn7G.js`  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Premissa:** Fase α ENCERRADA · D-FRETE **B** · sem live frete C sem nova assinatura  
**Soberana:** [FAL_MARCHA_SOBERANA_POS_ALPHA_EXEC_2026-11-04.md](./FAL_MARCHA_SOBERANA_POS_ALPHA_EXEC_2026-11-04.md)

---

## 0. Hotfix M0 — FEITO

| Item | Estado |
|------|--------|
| Zoom pan + toast Ver carrinho | **FEITO** PR #59 → `main` |

---

## 1. Feito (não reabrir)

| # | Entrega | Evidência |
|---|---------|-----------|
| M3–M5 | Docs / regras Onda1 / pg_cron | #51–#53 |
| Central + ME sandbox Expedição | #56 |
| ME híbrido D12 | #57 · migration · Edges |
| Docs ME ops | #58 |
| UX zoom/toast | #59 |

---

## 2. Fila vigente (humano → smoke)

| # | MARCHA | Gate |
|---|--------|------|
| **M-ME-SEC** | Secrets sandbox `MELHOR_ENVIO_TOKEN` + `USER_AGENT` | CLI 04/11: **ausentes** |
| **M6** | Peso+dims (≥1 SKU smoke) | 0 quote-ready / 100 published |
| **M7** | Ops E2E Central → etiqueta | Após SEC + M6 |
| M8 | Onda 2 estorno | Política comercial |
| M9 | Webhook MP MCP | Ainda vazio (ressalva) |
| M11+ | D-FRETE C / ME default loja | Nova assinatura |

---

## 3. O que NÃO misturar

- Não ativar ME como default do checkout sem C.  
- Não inventar medidas.  
- Não comprar etiqueta no webhook MP.

---

**Assinatura agente:** mapa pós-#56 sync soberana · 2026-11-04
