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
| **H5 local (Vite)** | **PASS 18:07** — `resolvePaymentProviderKey()=mercadopago` após vars em `fal-pecas/.env.local` + restart |
| **H5 Netlify (prod)** | **PENDENTE deploy** — bundle ainda `index-oy7VRadL.js` (stale); Trigger deploy obrigatório |
| Pix sandbox | **NÃO EXECUTADO** (local H5 OK; falta smoke + Edge secrets) |
| Cartão sandbox | **NÃO EXECUTADO** (local H5 OK; falta smoke + Edge secrets) |
| Webhook approve | **NÃO EXECUTADO** |
| Prep documental | Pronto |
| Netlify → wtbp (catálogo) | **OK** |

Agente **não** lê nem altera `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` / vars Netlify.

---

## Evidência UI

### Produção (print ~17:49) — FATO

**«Pagamento (simulado)»** no Netlify → build publicado sem MP (ou stale).

### Localhost (~18:07) — FATO

- Vars na raiz não bastam; Vite lê `fal-pecas/.env.local` (corrigido).
- Restart Vite → `isMercadoPagoCheckoutEnabled() === true`.
- UI logada deve mostrar **«Pagamento — Mercado Pago»**.

### Ação restante (prod)

**Netlify → Trigger deploy** (vars Vite só entram no build).  
Depois: Edge secrets H1–H4 + smoke Pix/cartão.

| Secret Edge | Nota |
|-------------|------|
| `MP_ACCESS_TOKEN` | TEST |
| `MP_ENV` | `test` |
| `MP_WEBHOOK_SECRET` | webhook |
| Redeploy functions | após secrets |

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
