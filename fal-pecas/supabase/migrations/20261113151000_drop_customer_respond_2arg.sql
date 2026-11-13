-- Evita ambiguidade PostgREST: só a assinatura com p_reason permanece.
drop function if exists public.customer_respond_order_decision(uuid, text);
