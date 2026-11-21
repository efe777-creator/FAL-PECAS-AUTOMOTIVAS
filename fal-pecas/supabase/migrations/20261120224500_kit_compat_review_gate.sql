-- K5: PVC próprio do kit + flag de revisão quando componente muda aplicação (H6/H10).

alter table public.products
  add column if not exists kit_compat_review_required boolean not null default false;

comment on column public.products.kit_compat_review_required is
  'Kit: true quando PVC de algum componente mudou; bloqueia republicação até revisão humana.';

create or replace function public.flag_kits_compat_review_for_component(p_component_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
  set kit_compat_review_required = true, updated_at = now()
  where p.product_kind = 'kit'
    and p.kit_compat_review_required is not true
    and exists (
      select 1
      from public.product_kit_components c
      where c.kit_product_id = p.id
        and c.component_product_id = p_component_id
    );
end;
$$;

create or replace function public.trg_pvc_flag_kit_compat_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.flag_kits_compat_review_for_component(old.product_id);
    return old;
  end if;
  perform public.flag_kits_compat_review_for_component(new.product_id);
  return new;
end;
$$;

drop trigger if exists pvc_flag_kit_compat_review_trg on public.product_vehicle_compatibility;
create trigger pvc_flag_kit_compat_review_trg
  after insert or update or delete on public.product_vehicle_compatibility
  for each row execute function public.trg_pvc_flag_kit_compat_review();
