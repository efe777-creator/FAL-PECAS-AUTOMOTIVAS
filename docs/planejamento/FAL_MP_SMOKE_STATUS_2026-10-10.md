# Smoke Mercado Pago — status de execução

**Data:** 2026-10-10 · **sync smoke S2:** 2026-11-04  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Prep:** [FAL_MP_SMOKE_PREP_2026-10-09.md](./FAL_MP_SMOKE_PREP_2026-10-09.md)  
**Check H1–H6:** [FAL_MP_SMOKE_H1H6_CHECK_2026-10-14.md](./FAL_MP_SMOKE_H1H6_CHECK_2026-10-14.md)  
**VAL S2:** [FAL_MARCHA_SMOKE_MP_S2_VAL_2026-11-04.md](./FAL_MARCHA_SMOKE_MP_S2_VAL_2026-11-04.md)  
**Loja:** https://fal-pecas-automotivas.netlify.app  

---

## Resultado S2 — 2026-11-04 (FATO)

| Item | Estado | Evidência |
|------|--------|-----------|
| H1–H5 | **PASS** (14/10) | H1H6 check |
| H6 | **PASS** | MCP `create_test_user` MLB buyer — user já existia (`TESTUSER4281159213436430510`, ativo desde 14/10). Senha **não** documentada |
| UI checkout MP | **PASS** | Título **«Pagamento — Mercado Pago»** + Pix / Cartão (não “simulado”) |
| Pix (create cobrança) | **PASS parcial** | Pedido `4b3e2f33-407f-4aa3-b1db-72608da6605b` · 04/11/2026 09:54 · total R$ 186,34 · **Pagamento: mercadopago · pending** · status pedido Aguardando pagamento |
| Pix (QR / copia-cola UI) | **FAIL / BLOQUEADO UI** | Após «Gerar cobrança Pix» / Processando, checkout remonta **«Carrinho vazio»** — painel QR **não** permaneceu observável |
| Cartão (place_order) | **PASS parcial** | Pedido `b3312ed0…` · 04/11/2026 · R$ 186,34 · Aguardando pagamento (criado após «Continuar para cartão») |
| Cartão (Brick approve) | **FAIL / BLOQUEADO UI** | Mesmo sintoma: pós-`place_order` → Carrinho vazio; Brick **não** preenchido/aprovado nesta sessão |
| Webhook approve | **NÃO OBSERVADO** | Pedidos seguem Aguardando pagamento; MCP `notifications_history` app `8320396999442614` → **No Notifications Found** |
| FIND-015 | **OK neste smoke** | Fluxo usou MP (não `pix_simulated` como pago) |

**Veredicto S2 comercial completo:** **NÃO PASS** (create/pedido OK; UX pós-pedido + approve webhook **não** fechados).

---

## Finding (novo) — bloqueia smoke UX

**FIND-SMOKE-UI-001:** Após `place_order` com canal MP (Pix ou cartão), a limpeza do carrinho faz o `CheckoutPage` cair no estado **Carrinho vazio**, interrompendo a exibição de `MercadoPagoPixPanel` / `MercadoPagoCardBrickPanel` na mesma navegação.

**Impacto:** cobrança/pedido podem existir no backend (`mercadopago · pending`), mas o cliente perde a UI de pagamento no checkout.

**Próxima MARCHA técnica sugerida (auth):** `MARCHA_FIX_CHECKOUT_MP_POST_ORDER_UI` — manter `mpAwaiting` / rota de pagamento mesmo com carrinho vazio após place_order.

**Update 04/11:** fix **IMPLEMENTADO** — [VAL](./FAL_MARCHA_FIX_CHECKOUT_MP_POST_ORDER_UI_VAL_2026-11-04.md).  
**Reteste prod pós-PR #43:** bundle `index-CV1mwNAe.js`  
- Pix UI **PASS** — pedido `0df5901c…` · pending · QR/copia-cola permanece.  
- Cartão Brick UI **PASS** — pedido `73530b8f…` · R$ 79,01 · iframe `secure-fields.mercadopago.com` (PAN/CVV no Brick; fill automático **bloqueado** por iframe).  
- Webhook sandbox URL **registrada** 04/11 via MCP `save_webhook` app `8320396999442614` → edge wtbp `mercado-pago-webhook` (topic `payment`).  
- Approve / `notifications_history`: ainda **NÃO OBSERVADO** (sem pagamento aprovado no Brick/Pix). Confirmar `MP_WEBHOOK_SECRET` = secret do painel MP (humano; não logar valor).

---

## Registro

```text
Data: 2026-11-04
Executor: agente (SMOKE MP / MARCHA SOBERANA auth eFe)
Ambiente: https://fal-pecas-automotivas.netlify.app / wtbpwuiayednvlhvuhbh
H1–H6: H1–H5 PASS · H6 PASS (user teste existente)
Pix: PASS parcial (pedido+pending) / FAIL UI QR — order 4b3e2f33-407f-4aa3-b1db-72608da6605b
Cartão: PASS parcial (pedido) / FAIL UI Brick — order b3312ed0…
Webhook: NÃO OBSERVADO (sem notify history; pedidos ainda aguardando)
FIND-015: OK
Próximo: MARCHA_FIX_CHECKOUT_MP_POST_ORDER_UI → reteste Pix/cartão/webhook
```

---

## STOP

Sem inventar approve. Sem Gate α. Sem D-FRETE assinado pelo agente.
