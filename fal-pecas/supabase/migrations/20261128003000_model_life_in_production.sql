-- Linha em produção: production_year_end null.
-- p_in_production true não fecha o fim no último ano da FIPE (2027 não é "parou").
-- A versão continua com o período dela; a aplicação do produto usa o próprio período.

drop function if exists public.merge_model_production_years(uuid, int, int);

create or replace function public.merge_model_production_years(
  p_model_id uuid,
  p_year_start int default null,
  p_year_end int default null,
  p_in_production boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start int;
  v_end int;
  v_row public.models%rowtype;
begin
  if not public.is_staff()
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'staff_or_service_role_required' using errcode = '42501';
  end if;

  if p_model_id is null then
    raise exception 'model_id_required';
  end if;

  select * into v_row from public.models where id = p_model_id for update;
  if not found then
    raise exception 'model_not_found';
  end if;

  v_start := v_row.production_year_start;
  v_end := v_row.production_year_end;

  if p_year_start is not null and p_year_start >= 1950 and p_year_start <= 2100 then
    v_start := case
      when v_start is null then p_year_start
      else least(v_start, p_year_start)
    end;
  end if;

  if p_in_production then
    v_end := null;
  elsif p_year_end is not null and p_year_end >= 1950 and p_year_end <= 2100 then
    v_end := case
      when v_end is null then p_year_end
      else greatest(v_end, p_year_end)
    end;
  elsif p_year_start is not null and p_year_start >= 1950 and p_year_start <= 2100 then
    v_end := case
      when v_end is null then p_year_start
      else greatest(v_end, p_year_start)
    end;
  end if;

  if v_start is not null and v_end is not null and v_end < v_start then
    v_end := v_start;
  end if;

  update public.models
  set
    production_year_start = v_start,
    production_year_end = v_end
  where id = p_model_id
  returning * into v_row;

  return jsonb_build_object(
    'modelId', v_row.id,
    'productionYearStart', v_row.production_year_start,
    'productionYearEnd', v_row.production_year_end
  );
end;
$$;

revoke all on function public.merge_model_production_years(uuid, int, int, boolean) from public;
grant execute on function public.merge_model_production_years(uuid, int, int, boolean) to authenticated;
grant execute on function public.merge_model_production_years(uuid, int, int, boolean) to service_role;

comment on function public.merge_model_production_years(uuid, int, int, boolean) is
  'Expande a vida da linha. p_in_production true deixa o fim null (ainda fabrica).';
