# Auditoria F7D — Expedição

**Data:** 2026-10-04 · **Veredito:** APROVADA

- `shipments.carrier`, `service`, `shipped_at`
- RPC `ship_order` (manual; sem API transportadora)
- Transição `pronto_para_envio` → `enviado` + evento customer
