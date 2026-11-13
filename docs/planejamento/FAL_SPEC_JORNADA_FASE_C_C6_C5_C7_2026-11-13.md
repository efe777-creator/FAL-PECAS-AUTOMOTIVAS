# Spec — Jornada Fase C (C6 / C5 / C7)

**Data:** 2026-11-13  
**Auth:** eFe — plano MARCHA

## C6 Frete próprio vitrine
- Own não some quando ME falha ou faltam dims ME.
- CRUD prestadores em Logística → Frete próprio → Prestadores.
- OwnShipPanel: dims/packing, apps do banco, histórico de tentativas.

## C5 Cotação / volumes
- `checkout_quote` imutável; `ops_quotes[]` append-only.
- UI original × packing × ops; seleção de serviço na recote.
- `orders.shipping_amount` nunca muda (G8 delta).

## C7 Expedição / rastreio
- `ship_order` aceita `tracking_url`.
- Inbox `shipment_tracking_updated`.
- Webhook ME tracking-only (sem auto-deliver).

WhatsApp fora de escopo.
