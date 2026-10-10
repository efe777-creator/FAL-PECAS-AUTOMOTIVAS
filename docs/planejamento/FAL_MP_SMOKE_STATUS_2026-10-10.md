# Smoke Mercado Pago — status de execução

**Data:** 2026-10-10 (rev. evidência UI checkout)  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Prep:** [FAL_MP_SMOKE_PREP_2026-10-09.md](./FAL_MP_SMOKE_PREP_2026-10-09.md)  
**Loja:** https://fal-pecas-automotivas.netlify.app  
**Plano α:** [FAL_PLANO_FINALIZACAO_ALPHA_SOBERANO_2026-10-10.md](./FAL_PLANO_FINALIZACAO_ALPHA_SOBERANO_2026-10-10.md) · passo **S2**

---

## Resultado (agente)

| Item | Estado |
|------|--------|
| Checklist H1–H6 | **BLOQUEADO — gate humano** |
| **H5 (Netlify MP)** | **FAIL evidenciado** — ver § Evidência UI |
| Pix sandbox | **NÃO EXECUTADO** (UI em modo simulado) |
| Cartão sandbox | **NÃO EXECUTADO** (UI em modo simulado) |
| Webhook approve | **NÃO EXECUTADO** |
| Prep documental | Pronto |
| Netlify → wtbp (catálogo) | **OK** |

Agente **não** lê nem altera `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` / vars Netlify.

---

## Evidência UI (FATO) — 2026-10-10

Checkout produção no passo **Pagamento** exibe:

- Título: **«Pagamento (simulado)»**
- Opções: **Pix simulado** / **Cartão simulado**
- Texto: *«Pagamento em modo demonstração (sem cobrança real). Para Pix e cartão reais, configure o provedor Mercado Pago no ambiente da loja.»*

**Interpretação (código):** `isMercadoPagoCheckoutEnabled()` = false  
→ `VITE_PAYMENT_PROVIDER` **não** está `mercadopago` / `mp` no build Netlify atual  
(arquivo: `fal-pecas/src/services/payments/paymentService.ts` · UI: `CheckoutPage` quando `!mpEnabled`).

Isso **confirma H5 pendente/falho** antes de qualquer smoke Pix/cartão real.

---

## Ação humana imediata (H5 + S0)

No painel **Netlify → Site settings → Environment variables** (e **Trigger deploy** depois):

| Variável | Valor esperado (smoke sandbox) |
|----------|--------------------------------|
| `VITE_PAYMENT_PROVIDER` | `mercadopago` |
| `VITE_MP_PUBLIC_KEY` | Public Key **TEST** da conta MP |
| `VITE_SUPABASE_URL` | URL wtbp (já OK no catálogo) |
| `VITE_SUPABASE_ANON_KEY` | anon wtbp |

No **Supabase wtbp → Edge secrets** (H1–H4):

| Secret | Nota |
|--------|------|
| `MP_ACCESS_TOKEN` | Access Token **TEST** |
| `MP_ENV` | `test` |
| `MP_WEBHOOK_SECRET` | obrigatório para webhook |
| Redeploy | `create-mp-payment` + `mercado-pago-webhook` após secrets |

**Done when:** checkout mostra **«Pagamento — Mercado Pago»** (não «simulado») + hard refresh.

---

## Ordem humana (resumo)

1. **S0** Trigger deploy se `main` atrasado  
2. **H5** vars Netlify MP + redeploy site  
3. **H1–H4** secrets Edge + redeploy functions  
4. **H6** conta/usuário sandbox MP  
5. Pix + cartão com evidências → preencher registro abaixo  
6. Desbloqueia E2E α (S4)

---

## Registro (preencher no smoke humano)

```text
Data:
Executor:
Ambiente (URL / project-ref): https://fal-pecas-automotivas.netlify.app / wtbpwuiayednvlhvuhbh
H1–H6: OK / FALHA (detalhe)
  H5 UI: FAIL 2026-10-10 — Pagamento (simulado) em produção (evidência print)
Pix: PASS / FAIL / BLOQUEADO — evidências:
Cartão: PASS / FAIL / BLOQUEADO — evidências:
Webhook: PASS / FAIL / NÃO TESTÁVEL —
FIND-015: OK / FAIL — (hoje: simulado ativo = FIND-015 em risco se venda real)
Próximo: setar VITE_PAYMENT_PROVIDER=mercadopago + deploy + retestar
```

---

## Encerramento

**Entrega agente:** H5 **FAIL** documentado com UI; ponte de correção Netlify/Edge.  
**Aceite smoke:** somente após UI MP real + evidências Pix/cartão.
