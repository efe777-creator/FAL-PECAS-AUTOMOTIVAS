# VAL — AJUSTE-035 MARCHA | place_order remoto + checkout local

**Data:** 2026-11-12  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Escopo:** aplicar CHECKOUT-01 no banco prod-linked · validar função · testes FE · **sem** Netlify/auto-deploy front

---

## Feito nesta MARCHA

| # | Ação | Resultado | Evidência |
|---|------|-----------|-----------|
| 1 | Apply SQL `20261112190000_place_order_idempotent_payment_id.sql` | **PASS** | `supabase db query --remote --yes -f …` |
| 2 | Função remota com `payment_status` + `clear_cart` | **PASS** | `has_payment_status=true` · `has_clear_cart=true` |
| 3 | Comment da função | **PASS** | `AJUSTE-035: idempotent return inclui payment_id/status; clear_cart opcional (buy_now).` |
| 4 | Unit tests checkout | **PASS** | 12/12 (`src/services/checkout` + emptyGuard) |
| 5 | `supabase db push --remote` full history | **SKIP** | Drift histórico remoto ≠ local; apply pontual via `db query` |

---

## Critérios C1–C5 (código + RPC)

| Critério | Status |
|----------|--------|
| C1 `!paymentId` ≠ aprovação | Código + RPC retorna `payment_id` no idempotente |
| C2 servidor prevalece | `resumeCheckoutFromServer` no mount |
| C3 retry mesmo pedido | UI retry Pix + Edge already expires pending |
| C4 concorrência | `idempotency_key` + `submitLockRef` |
| C5 buy_now isolado | session + `clear_cart=false` no RPC |

---

## Aberto (humano / próxima marcha)

1. Smoke Pix/cartão no front local (`localhost` → Edge prod) com refresh mid-checkout.  
2. Deploy Netlify do front quando eFe autorizar.  
3. CP-PAY-021 webhook **prod** (continua D).  
4. Registrar migration no histórico `supabase_migrations` se quiser alinhar `db push` (repair separado).

---

## Veredicto

| Critério | Status |
|----------|--------|
| RPC place_order AJUSTE-035 em `wtbp` | **PASS** |
| Testes checkout | **PASS** |
| Homologação E2E pagamento live | **ABERTO** (humano) |
| Publish front | **NÃO** nesta marcha |

**Assinatura agente:** MARCHA AJUSTE-035 CHECKOUT-01 remoto · 2026-11-12.
