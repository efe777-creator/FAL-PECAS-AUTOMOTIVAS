-- Cadastro: persistir CPF do metadata em customers; username em lower-case.
-- Corrige perda de CPF quando o Auth exige confirmação de e-mail (sem sessão no signUp).
-- Sem assumir UNIQUE(profile_id) no remoto (schema pode divergir do dump local).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text := nullif(lower(trim(coalesce(new.raw_user_meta_data ->> 'username', ''))), '');
  v_cpf text := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'cpf', ''), '\D', '', 'g'), '');
  v_cpf_ok text := case when v_cpf is not null and length(v_cpf) = 11 then v_cpf else null end;
begin
  insert into public.profiles (
    id,
    username,
    full_name,
    phone,
    role,
    verification_grace_ends_at,
    account_verified_at
  )
  values (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'customer',
    now() + interval '48 hours',
    case when new.email_confirmed_at is not null then new.email_confirmed_at else null end
  )
  on conflict (id) do nothing;

  if exists (select 1 from public.customers c where c.profile_id = new.id) then
    update public.customers
    set cpf = coalesce(cpf, v_cpf_ok)
    where profile_id = new.id
      and cpf is null
      and v_cpf_ok is not null;
  else
    insert into public.customers (profile_id, cpf)
    values (new.id, v_cpf_ok);
  end if;

  return new;
end;
$$;
