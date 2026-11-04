-- M5 CRON-EXPIRY: agendar expire_unpaid_orders via pg_cron (decisão eFe 04/11)
-- Frequência: a cada hora (minuto 15). TTL permanece 48 h na RPC.

create extension if not exists pg_cron;

-- Idempotente: remove job anterior com o mesmo nome, se existir
do $$
declare
  jid bigint;
begin
  for jid in
    select jobid from cron.job where jobname = 'fal-expire-unpaid-orders'
  loop
    perform cron.unschedule(jid);
  end loop;
end $$;

select cron.schedule(
  'fal-expire-unpaid-orders',
  '15 * * * *',
  $$select public.expire_unpaid_orders(50, 48)$$
);

comment on extension pg_cron is
  'Agendador FAL: fal-expire-unpaid-orders → expire_unpaid_orders(50, 48) horária';
