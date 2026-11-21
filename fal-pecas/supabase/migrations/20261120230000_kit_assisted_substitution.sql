-- K8: substituição assistida de componente em kits selecionados (transacional).
-- Pedidos/histórico (order_items.kit_composition_snapshot) permanecem intocados.

create or replace function public.admin_replace_component_in_kits(
  p_old_component_id uuid,
  p_new_component_id uuid,
  p_kit_ids uuid[],
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_kit_id uuid;
  v_old_row public.product_kit_components%rowtype;
  v_existing_new public.product_kit_components%rowtype;
  v_old_kind text;
  v_new_kind text;
  v_updated uuid[] := array[]::uuid[];
  v_skipped jsonb := '[]'::jsonb;
  v_merged_qty numeric(12, 3);
begin
  if v_actor is null or not public.is_staff() then
    raise exception 'admin_replace_component_in_kits: staff only';
  end if;

  if p_old_component_id is null or p_new_component_id is null then
    raise exception 'admin_replace_component_in_kits: componentes obrigatórios';
  end if;

  if p_old_component_id = p_new_component_id then
    raise exception 'admin_replace_component_in_kits: componente novo deve ser diferente do antigo';
  end if;

  if p_kit_ids is null or cardinality(p_kit_ids) = 0 then
    raise exception 'admin_replace_component_in_kits: selecione ao menos um kit';
  end if;

  select product_kind into v_old_kind from public.products where id = p_old_component_id;
  select product_kind into v_new_kind from public.products where id = p_new_component_id;

  if v_old_kind is distinct from 'item' then
    raise exception 'admin_replace_component_in_kits: componente antigo deve ser item';
  end if;
  if v_new_kind is distinct from 'item' then
    raise exception 'admin_replace_component_in_kits: componente novo deve ser item (v1)';
  end if;

  foreach v_kit_id in array p_kit_ids
  loop
    if not exists (
      select 1 from public.products p
      where p.id = v_kit_id and p.product_kind = 'kit'
    ) then
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object(
        'kit_product_id', v_kit_id,
        'reason', 'not_a_kit'
      ));
      continue;
    end if;

    select * into v_old_row
    from public.product_kit_components
    where kit_product_id = v_kit_id
      and component_product_id = p_old_component_id
    for update;

    if not found then
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object(
        'kit_product_id', v_kit_id,
        'reason', 'old_component_absent'
      ));
      continue;
    end if;

    select * into v_existing_new
    from public.product_kit_components
    where kit_product_id = v_kit_id
      and component_product_id = p_new_component_id
    for update;

    if found then
      -- Novo já está no kit: soma qty e remove o antigo.
      v_merged_qty := v_existing_new.quantity + v_old_row.quantity;
      update public.product_kit_components
      set quantity = v_merged_qty, updated_at = now()
      where id = v_existing_new.id;

      delete from public.product_kit_components where id = v_old_row.id;

      insert into public.product_kit_component_events (
        kit_product_id, event_type,
        component_product_id, previous_component_product_id,
        quantity, previous_quantity, actor_id, note
      ) values (
        v_kit_id, 'replace',
        p_new_component_id, p_old_component_id,
        v_merged_qty, v_old_row.quantity, v_actor,
        coalesce(p_note, 'substituição assistida (merge qty)')
      );
    else
      update public.product_kit_components
      set component_product_id = p_new_component_id, updated_at = now()
      where id = v_old_row.id;

      insert into public.product_kit_component_events (
        kit_product_id, event_type,
        component_product_id, previous_component_product_id,
        quantity, previous_quantity, actor_id, note
      ) values (
        v_kit_id, 'replace',
        p_new_component_id, p_old_component_id,
        v_old_row.quantity, v_old_row.quantity, v_actor,
        coalesce(p_note, 'substituição assistida')
      );
    end if;

    update public.products
    set kit_compat_review_required = true, updated_at = now()
    where id = v_kit_id;

    v_updated := array_append(v_updated, v_kit_id);
  end loop;

  return jsonb_build_object(
    'updated_kit_ids', to_jsonb(coalesce(v_updated, array[]::uuid[])),
    'skipped', v_skipped,
    'old_component_id', p_old_component_id,
    'new_component_id', p_new_component_id
  );
end;
$$;

comment on function public.admin_replace_component_in_kits(uuid, uuid, uuid[], text) is
  'K8: troca componente antigo→novo só nos kits selecionados; eventos + flag compat; pedidos intactos.';

revoke all on function public.admin_replace_component_in_kits(uuid, uuid, uuid[], text) from public;
grant execute on function public.admin_replace_component_in_kits(uuid, uuid, uuid[], text) to authenticated;
