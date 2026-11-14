-- CP-NOT N4: backfill título/body/severity/actionable staff a partir do catálogo.
-- Mantém prefixo "Pedido #XXXXXXXX — " quando já existir no body.

update public.app_notifications n
set
  title = coalesce(c.staff_title, n.title),
  body = case
    when n.body ~ '^Pedido #[A-Za-z0-9]+ — '
      then regexp_replace(
        n.body,
        '^(Pedido #[A-Za-z0-9]+ — ).*$',
        '\1' || coalesce(c.staff_body, n.body)
      )
    when c.staff_body is not null and n.order_id is not null
      then 'Pedido #' || upper(left(replace(n.order_id::text, '-', ''), 8))
           || ' — ' || c.staff_body
    else coalesce(c.staff_body, n.body)
  end,
  severity = case
    when c.severity = 'acao_necessaria' then 'acao_necessaria'
    else 'operacional'
  end,
  actionable = (c.severity = 'acao_necessaria'),
  category = coalesce(n.category, c.category)
from public.notification_kind_catalog c
where n.audience = 'staff'
  and c.kind = n.kind
  and c.staff_title is not null
  and (
    n.title is distinct from c.staff_title
    or n.severity is null
    or n.severity is distinct from case
      when c.severity = 'acao_necessaria' then 'acao_necessaria'
      else 'operacional'
    end
    or n.actionable is distinct from (c.severity = 'acao_necessaria')
  );
