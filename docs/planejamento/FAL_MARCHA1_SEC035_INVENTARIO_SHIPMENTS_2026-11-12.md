# Marcha 1c — Inventário SEC-035 (shipments / metadata)

**Data:** 2026-11-12  
**Status:** Inventário (sem harden ainda) · commits locais apenas  
**Plano:** V2.2

## Writers conhecidos

| Caminho | O que escreve | Risco |
|---------|---------------|-------|
| `place_order` (SECURITY DEFINER) | insert shipment + metadata cotação | OK — criação |
| `admin_set_order_packing` | `metadata.packing` via jsonb_set | OK — RPC |
| Edge `melhorenvio-label` | `metadata.me.*` label_state, cart, PDF | OK — Edge |
| `ship_order` / `deliver_order` | status/timestamps shipment | OK — RPC |
| Policy `shipments_staff_write` | INSERT/UPDATE/DELETE genérico staff | **P0** — bypass possível de provider/me/packing |
| Client admin direto `.from('shipments').update` | **Não encontrado** em `fal-pecas/src` (grep 2026-11-12) | Baixo no FE; risco permanece na policy staff |

## Campos críticos (só RPC/Edge na harden)

- `provider`
- `amount` / charged_shipping em metadata
- `metadata.me` (label_state, cart_item_id, transaction, documents)
- `metadata.packing`
- `metadata.own` (snapshot cotação)
- `shipped_at`, `delivered_at`, `tracking_code`, `proof_ref`

## Próximo passo (ainda Marcha 1c)

1. Grep FE por `from('shipments')` update.
2. Restringir policy staff a SELECT (ou UPDATE só colunas não críticas).
3. Garantir que todo write crítico passa por RPC/Edge + `order_events`.

## Harden local (2026-11-12)

Migration `20261112183000_place_order_fingerprint_sec035.sql` **dropa** `shipments_staff_write`.
Writes passam a depender de SECURITY DEFINER / service_role.

**Remoto:** migrate só com auth eFe (marcha soberana = commits locais).
