-- K10: import em massa da composição de kits (sync por kit_sku no lote).

create or replace function public.apply_kit_composition_import(
  p_rows jsonb,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_kit_sku text;
  v_kit_id uuid;
  v_kit_kind text;
  v_comp_sku text;
  v_comp_id uuid;
  v_comp_kind text;
  v_qty numeric(12, 3);
  v_sort int;
  v_row jsonb;
  v_kit_skus text[];
  v_line_errors jsonb := '[]'::jsonb;
  v_kits_synced int := 0;
  v_lines_written int := 0;
  v_note text := coalesce(nullif(trim(p_note), ''), 'import composição kits');
begin
  if v_actor is null or not public.is_staff() then
    raise exception 'apply_kit_composition_import: staff only';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'apply_kit_composition_import: lote vazio';
  end if;

  -- Kits distintos no lote (ordem de aparição).
  select array_agg(x order by ord)
  into v_kit_skus
  from (
    select
      upper(trim(r ->> 'kit_sku')) as x,
      min(ordinality) as ord
    from jsonb_array_elements(p_rows) with ordinality as t(r, ordinality)
    where nullif(trim(r ->> 'kit_sku'), '') is not null
    group by upper(trim(r ->> 'kit_sku'))
  ) s;

  if v_kit_skus is null or cardinality(v_kit_skus) = 0 then
    raise exception 'apply_kit_composition_import: nenhum kit_sku válido';
  end if;

  foreach v_kit_sku in array v_kit_skus
  loop
    select id, product_kind into v_kit_id, v_kit_kind
    from public.products
    where upper(sku) = v_kit_sku
    limit 1;

    if v_kit_id is null then
      v_line_errors := v_line_errors || jsonb_build_array(jsonb_build_object(
        'kit_sku', v_kit_sku, 'reason', 'kit_not_found'
      ));
      continue;
    end if;

    if v_kit_kind is distinct from 'kit' then
      v_line_errors := v_line_errors || jsonb_build_array(jsonb_build_object(
        'kit_sku', v_kit_sku, 'reason', 'not_a_kit'
      ));
      continue;
    end if;

    -- Remove BOM atual do kit (sync do lote).
    delete from public.product_kit_components where kit_product_id = v_kit_id;

    insert into public.product_kit_component_events (
      kit_product_id, event_type, actor_id, note
    ) values (
      v_kit_id, 'remove', v_actor, v_note || ' (limpa antes do sync)'
    );

    v_sort := 0;
    for v_row in
      select r
      from jsonb_array_elements(p_rows) as t(r)
      where upper(trim(r ->> 'kit_sku')) = v_kit_sku
    loop
      v_comp_sku := upper(trim(v_row ->> 'component_sku'));
      begin
        v_qty := nullif(trim(v_row ->> 'quantity'), '')::numeric;
      exception when others then
        v_qty := null;
      end;

      if v_comp_sku is null or v_comp_sku = '' then
        v_line_errors := v_line_errors || jsonb_build_array(jsonb_build_object(
          'kit_sku', v_kit_sku, 'reason', 'component_sku_missing'
        ));
        continue;
      end if;

      if v_qty is null or v_qty <= 0 then
        v_line_errors := v_line_errors || jsonb_build_array(jsonb_build_object(
          'kit_sku', v_kit_sku, 'component_sku', v_comp_sku, 'reason', 'invalid_quantity'
        ));
        continue;
      end if;

      select id, product_kind into v_comp_id, v_comp_kind
      from public.products
      where upper(sku) = v_comp_sku
      limit 1;

      if v_comp_id is null then
        v_line_errors := v_line_errors || jsonb_build_array(jsonb_build_object(
          'kit_sku', v_kit_sku, 'component_sku', v_comp_sku, 'reason', 'component_not_found'
        ));
        continue;
      end if;

      if v_comp_kind is distinct from 'item' then
        v_line_errors := v_line_errors || jsonb_build_array(jsonb_build_object(
          'kit_sku', v_kit_sku, 'component_sku', v_comp_sku, 'reason', 'component_not_item'
        ));
        continue;
      end if;

      if v_comp_id = v_kit_id then
        v_line_errors := v_line_errors || jsonb_build_array(jsonb_build_object(
          'kit_sku', v_kit_sku, 'component_sku', v_comp_sku, 'reason', 'self_reference'
        ));
        continue;
      end if;

      -- Upsert se o mesmo componente repetir no arquivo.
      insert into public.product_kit_components (
        kit_product_id, component_product_id, quantity, sort_order
      ) values (
        v_kit_id, v_comp_id, v_qty, v_sort
      )
      on conflict (kit_product_id, component_product_id)
      do update set
        quantity = public.product_kit_components.quantity + excluded.quantity,
        updated_at = now();

      insert into public.product_kit_component_events (
        kit_product_id, event_type,
        component_product_id, quantity, actor_id, note
      ) values (
        v_kit_id, 'add', v_comp_id, v_qty, v_actor, v_note
      );

      v_sort := v_sort + 1;
      v_lines_written := v_lines_written + 1;
    end loop;

    update public.products
    set kit_compat_review_required = true, updated_at = now()
    where id = v_kit_id;

    v_kits_synced := v_kits_synced + 1;
  end loop;

  return jsonb_build_object(
    'kits_synced', v_kits_synced,
    'lines_written', v_lines_written,
    'errors', v_line_errors
  );
end;
$$;

comment on function public.apply_kit_composition_import(jsonb, text) is
  'K10: sync BOM por kit_sku a partir de lote JSON (staff). Pedidos/snapshots intactos.';

revoke all on function public.apply_kit_composition_import(jsonb, text) from public;
grant execute on function public.apply_kit_composition_import(jsonb, text) to authenticated;
