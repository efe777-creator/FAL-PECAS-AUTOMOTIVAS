# MARCHA Checkout — steps clicáveis + Pix QR

**Data:** 2026-10-10  
**Branch:** `dev`  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Entregas

1. **Steps do checkout** (`CheckoutPage`): chips viram `<button>`; navegam com `goToStep` / `maxReachedStep` (voltar livre; avançar com pré-requisitos).
2. **Pix seed:** `createMercadoPagoPayment` → `mpAwaiting.pixQr*` → `MercadoPagoPixPanel` (`initialPixQrCode` / Base64) — não depende só do poll RLS.
3. **Erros Edge legíveis:** `edgeErrorMessage` + parse do body em non-2xx; mensagem se cobrança sem QR.
4. **Edge `create-mp-payment`:** `detail` do MP em falha; reidrata QR em pagamento pending reutilizado.
5. **Pix CPF + retry (v6):** envia `payer.identification` (customers.cpf/cnpj); nova `X-Idempotency-Key` após falha MP (`mp_attempt`).

---

## Status

| | |
|--|--|
| Implementação | **OK** |
| `tsc --noEmit` | **OK** |
| Smoke Pix sandbox | **PENDENTE humano** — secret `MP_ACCESS_TOKEN` + redeploy function + reteste |
| Netlify UI | **PENDENTE** S0/H5 deploy |

### Evidência usuário (pré-fix)

- Steps eram `<span>` não clicáveis → corrigido.
- Finalizou checkout sem código Pix → client agora falha com mensagem explícita se Edge não devolver QR; Edge precisa secret TEST.

---

## Próximo (humano / S2)

1. Confirmar `MP_ACCESS_TOKEN` (TEST) nos secrets Edge + redeploy `create-mp-payment`
2. Retestar Pix local/prod e registrar em [FAL_MP_SMOKE_STATUS_2026-10-10.md](./FAL_MP_SMOKE_STATUS_2026-10-10.md)
3. S0 Netlify se bundle stale
