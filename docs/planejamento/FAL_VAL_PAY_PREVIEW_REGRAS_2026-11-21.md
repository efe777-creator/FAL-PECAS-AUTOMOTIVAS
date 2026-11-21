# FAL — VAL pagamentos + regras PIX/cartão (preview)

**Data:** 2026-11-21  
**Branch:** `dev`  
**Projeto runtime:** `wtbpwuiayednvlhvuhbh`  
**Site Netlify:** `fal-pecas-automotivas` (env também em `fal-pecas-automotivas-efe` se linkado)

## Diagnóstico: “tentei pagar no preview e não foi”

**Provável causa raiz (confirmada pelo ambiente):** preview/loja apontam para **raios de produção** MP + Asaas — não é sandbox de cartão de teste.

| Fato | Evidência |
|------|-----------|
| Front `VITE_MP_ENV=production` + `VITE_MP_PUBLIC_KEY=APP_USR-…` | Netlify (production / deploy-preview / branch) |
| Edge `MP_*` e `ASAAS_*` presentes no wtbp | `supabase secrets list` |
| Cartão = **sempre Asaas** | `paymentRouter` T5 + VAL cartão 2026-11-16 |
| Asaas em **produção** | Host `www.asaas.com`; cartões oficiais Asaas só sandbox → aprovação E2E **bloqueada** |
| PIX ≤ R$ 201,00 → MP; acima → Asaas | `DEFAULT_PIX_MP_MAX_AMOUNT_CENTS = 20100` |
| Deploy “current” do site às vezes é **preview antigo** (ex. PR #256 / Nov 15) | Netlify deploy `6af904e8…` context `deploy-preview` |
| Non-production Netlify exige **SSO do time** | `requiresSSOTeamLogin: non_production` |

**Conclusão:** falha no preview **é esperável** ao usar cartão de teste / PIX de sandbox contra produção. Não indica quebra das regras de roteamento no código da `dev`.

### O que funciona para validar pagamento hoje

1. **PIX real (MP)** valor ≤ R$ 201 com conta/app live — QR real, pagar com app bancário.  
2. **PIX/cartão Asaas** — fatura real em produção (humano) ou mudar **só homolog** para `ASAAS_ENV=sandbox` + chave sandbox (HOLD humano).  
3. **Unitários** — 152 testes payments/checkout PASS nesta marcha.  
4. **Smokes Asaas create** — pedido precisa estar `aguardando_pagamento` (smoke antigo 409 `order_not_awaiting_payment` = pedido já cancelado).

## Regras garantidas (contrato)

| Método | Valor | Provider |
|--------|-------|----------|
| PIX | ≤ R$ 201,00 | Mercado Pago |
| PIX | > R$ 201,00 | Asaas |
| Crédito | qualquer | Asaas |
| Débito | qualquer | Asaas |
| Boleto | qualquer | Asaas |

Entrada única checkout: `createFalPayment` → Edge `create-fal-payment` (roteia no servidor).

## Evidência automatizada (2026-11-21)

| Check | Resultado |
|-------|-----------|
| Vitest `src/services/payments` + checkout + labels/display/condition | **152 PASS** |
| `paymentRouter.test.ts` T1–T6 | PASS |
| `paymentAntiregress.test.ts` (novo) | PASS |
| Netlify env preview tem `VITE_PAYMENT_PROVIDER=mercadopago` + PK APP_USR | Presente |
| Smoke Asaas create no pedido legado | 409 `order_not_awaiting_payment` (estado, não regra) |

## HOLD / próximos passos (humano)

1. Homolog cartão: `ASAAS_ENV=sandbox` + API key sandbox **ou** pagar fatura real em prod.  
2. Testar pagamento em URL **production** atualizada da `dev`/`main` autorizada — não em preview SSO antigo.  
3. Sem `--prod` Netlify sem autorização expressa.

## Como revalidar

```bash
cd fal-pecas
npx vitest run src/services/payments src/services/checkout src/lib/paymentDisplay.test.ts src/lib/paymentLabels.test.ts src/lib/paymentConditionPricing.test.ts
npx vitest run src/services/payments/paymentAntiregress.test.ts src/services/payments/routing/paymentRouter.test.ts
```
