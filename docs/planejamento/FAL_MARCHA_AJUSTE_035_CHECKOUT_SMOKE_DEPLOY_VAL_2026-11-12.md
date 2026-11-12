# VAL — AJUSTE-035 MARCHA | smoke buy_now + deploy Netlify

**Data:** 2026-11-12  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh` · local `localhost:5173` · Netlify `fal-pecas-automotivas-efe`

---

## Escopo

Smoke UI compra direta + deploy front produção (build local → upload dist). Sem novo smoke Pix R$1 (já VAL 11/11; CP-PAY-021 webhook prod permanece D).

---

## Evidências

| # | Check | Resultado | Evidência |
|---|-------|-----------|-----------|
| 1 | Build production | **PASS** | `npm run build` · fix `orderOpsWizard` (`allSeparated`) |
| 2 | Deploy Netlify | **PASS** | deploy `6af5e0b70e69d1771c5b2c78` · state `ready` · [site](https://fal-pecas-automotivas-efe.netlify.app/) |
| 3 | buy_now → checkout isolado | **PASS** | Catalog → Comprar agora → `/checkout` · **carrinho 0** · resumo `1 × AXIAL DE DIREÇÃO` |
| 4 | UX 2 momentos | **PASS** | texto `Etapa 1 de 2 — Identificação e entrega · Compra direta` |
| 5 | RPC place_order remoto (prévio) | **PASS** | VAL CHECKOUT-01 remoto · payment_id no idempotente |
| 6 | Pedido pending tem payment_id | **PASS** | ex. `949fce4f-…` → payment `4ea0887b-…` pending |
| 7 | Pix live R$1 nesta marcha | **N/A** | não repetido; sync path já homologado 11/11 |
| 8 | Webhook prod | **ABERTO** | CP-PAY-021 |

---

## Deploys

| Alvo | Ação |
|------|------|
| Netlify `fal-pecas-automotivas-efe` | Upload `fal-pecas/dist` · production published |
| Edges MP | Sem redeploy nesta marcha |
| SQL place_order | Já aplicado na MARCHA anterior |

---

## Veredicto

| Critério | Status |
|----------|--------|
| Front AJUSTE-035 em produção Netlify | **PASS** |
| Smoke buy_now + Etapa 1/2 | **PASS** |
| Carrinho intacto na compra direta | **PASS** |
| Prova financeira Pix live (nova) | **não nesta marcha** |
| Webhook prod | **ABERTO** |

**Assinatura agente:** MARCHA AJUSTE-035 smoke + Netlify · 2026-11-12.
