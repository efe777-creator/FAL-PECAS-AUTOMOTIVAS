# VAL — Onda gestão de pagamentos (PG05–PG11b parcial)

**Data:** 2026-11-09  
**Auth:** eFe — `MARCHA` continuação plano mestre  
**Deploy/secrets:** não

---

## Entregas

| ID | Item | Resultado |
|----|------|-----------|
| PG05 | Contrato motor `engine/` | PASS |
| PG06 | Adaptador `mercadoPagoAdapter` + checkout via `createFalPayment` | PASS |
| PG07 | `FalPaymentStatus` + map persistência | PASS |
| PG08 | Doc modelo sem tabelas novas | PASS |
| PG09–11 | Hub `/admin/pagamentos` + provedores + métodos | PASS |
| PG11b | `/admin/pagamentos/metodos/mercado-pago` | PASS (flags/env; sem secrets) |
| PG12–18 | configs finas, refunds API, monitor, permissões | **adiado** (hub webhooks stub) |

## Rotas admin

- `/admin/pagamentos`
- `/admin/pagamentos/provedores`
- `/admin/pagamentos/metodos`
- `/admin/pagamentos/metodos/mercado-pago`
- `/admin/pagamentos/webhooks` (referência)

## Testes

`vitest` engine + statuses + mpAdminStatus + adminNavAccess pagamentos.

**Assinatura:** VAL onda gestão pagamentos PASS (escopo PG05–11b) · 2026-11-09.
