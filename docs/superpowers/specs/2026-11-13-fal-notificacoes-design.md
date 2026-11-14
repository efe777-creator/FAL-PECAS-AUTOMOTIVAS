# FAL — Central de Notificações (design N4)

**Data:** 2026-11-13  
**Escopo:** in-app apenas (WhatsApp/e-mail arquitetados e OFF)  
**Abordagem:** evoluir motor `order_events` → `fanout_app_notification` → `app_notifications`

## Figma

- Arquivo: https://www.figma.com/design/ngSQc82mEQI0uXv51rK64r  
- Frames: Central / Cliente e Central / Operador

## Modelo

- `category`: pedidos | pagamentos | entregas | clientes | estoque | sistema  
- Leitura/contagem/mark-all filtrados por `audience` (`customer` | `staff`)  
- Realtime: `app_notifications` na publication `supabase_realtime`  
- Body padronizado com `Pedido #XXXXXXXX`  
- Canais externos: `notification_channel_config` permanece false

## UI

- Componente `NotificationInboxItem` (título, body, meta data·categoria, badge Nova/Atenção/Informativa, CTA)  
- Bell com `audience` obrigatório; sino duplicado removido de `AccountLayout`  
- Cliente: `/conta/avisos` · Operador: `/admin/avisos` (só staff)

## Migration

`fal-pecas/supabase/migrations/20261114100000_cp_not_n4_categories_audience.sql`
