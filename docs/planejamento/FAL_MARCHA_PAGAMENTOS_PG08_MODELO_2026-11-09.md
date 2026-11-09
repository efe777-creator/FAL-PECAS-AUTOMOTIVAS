# PG08 — Modelo lógico de transações e eventos (sem tabelas novas)

**Data:** 2026-11-09  
**Regra:** reutilizar `payments` + `payment_events` · não duplicar ledger

---

## Mapa responsabilidade → físico

| Lógico (plano) | Físico atual | Nota |
|----------------|--------------|------|
| Provedores | `payments.provider` + adaptadores TS (`engine/`) | Cadastro admin = UI; IDs em código nesta onda |
| Configurações | env/secrets + `store_payment_display` | Secrets nunca no browser |
| Métodos | `payments.method` + capabilities do adaptador | Toggle DB fino = onda PG11+/PG12 |
| Roteamento | `paymentEngine.primaryProviderId()` | Um provedor principal por env |
| Transações | `public.payments` | Fonte de verdade |
| Eventos | `public.payment_events` | Webhook idempotente |
| Reembolsos | `admin_mark_payment_refunded` + colunas refunded_at | Gateway refund API = PG15 |
| Auditoria | payment_events + order events | Permissões finas = PG18 |

## Estados

Motor TypeScript: `FalPaymentStatus` (inclui `authorized`, `in_process`, `partially_refunded`).  
Persistência: `toPersistedPaymentStatus` → CHECK atual. Migration de CHECK ampliado = quando PG07 for aplicado no banco (não nesta fatia).

## Checkout

Passa a chamar `createFalPayment` (motor) → `mercadoPagoAdapter` → Edge `create-mp-payment`.

**Assinatura:** PG08 modelo PASS · sem migration · 2026-11-09.
