# VAL — AJUSTE-035 MARCHA residual | recuperação E2E + UI 2 momentos + redeploy

**Data:** 2026-11-12  
**Auth:** eFe — `MARCHA`  
**Runtime:** local `localhost:5173` · Netlify `fal-pecas-automotivas-efe` · pedido `66dd89ff-c048-4eb0-b3eb-e580273b3bc0`

---

## Escopo

Fechar residuals do cruzamento: (1) prova recuperação retorno tardio com pedido **approved**; (2) pills CHECKOUT-04 em 2 momentos; (3) redeploy produção.

---

## Evidências

| # | Check | Resultado | Evidência |
|---|-------|-----------|-----------|
| 1 | Unit resume (C2 matriz) | **PASS** | `resumeCheckoutOutcome.test.ts` 4/4 · suite checkout **16/16** |
| 2 | UI pills 2 momentos | **PASS** | `MOMENT_LABELS` = Identificação e entrega / Pagamento · `CheckoutPage.tsx` |
| 3 | Build production | **PASS** | `npm run build` · `CheckoutPage-CldFXUeW.js` |
| 4 | Recuperação E2E (approved) | **PASS** | CDP `sessionStorage fal.checkoutSession.v1` + `/checkout` → `/pedido/66dd89ff-…/confirmacao` · título **Pedido recebido** |
| 5 | Redeploy Netlify | **PASS** | `dist` → deploy `6af5e33675093db91a132ce5` ready · [site](https://fal-pecas-automotivas-efe.netlify.app/) · chunk `CheckoutPage-CldFXUeW` |
| 6 | Refresh mid-Pix (QR aberto) | **ABERTO** | não repetido nesta marcha (pending UI); unit pending → `await_payment` cobre regra |
| 7 | Webhook secret / app live | **ABERTO** | CP-PAY-021 humano |

---

## Deploys

| Alvo | Ação |
|------|------|
| Netlify `fal-pecas-automotivas-efe` | Upload **`fal-pecas/dist`** · deploy `6af5e33675093db91a132ce5` (corrigiu upload acidental da raiz) |
| Edges / SQL | Sem mudança nesta marcha residual |

---

## Veredicto

| Critério | Status |
|----------|--------|
| Recuperação retorno tardio (approved → confirmação) | **PASS** |
| CHECKOUT-04 navegação 2 momentos | **PASS** |
| Front residual em produção | **PASS** (deploy residual) |
| Mid-Pix refresh live | **ABERTO** (baixo risco; unit + código resume) |
| CP-PAY-021 | **ABERTO** |

**Assinatura agente:** MARCHA AJUSTE-035 residual recovery + UI + Netlify · 2026-11-12.
