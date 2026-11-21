-- Política de graça 48h pós-cadastro + flags de verificação (e-mail / telefone).
-- WhatsApp OTP real fica para domínio + provider; schema já prepara phone_verified_at.

alter table public.profiles
  add column if not exists account_verified_at timestamptz,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists verification_grace_ends_at timestamptz;

comment on column public.profiles.account_verified_at is
  'Preenchido quando e-mail Auth confirmado ou telefone verificado.';
comment on column public.profiles.phone_verified_at is
  'Preenchido após OTP WhatsApp (provider no domínio).';
comment on column public.profiles.verification_grace_ends_at is
  'Fim da graça de 48h; após isso a confirmação torna-se obrigatória.';

-- Backfill graça a partir de created_at
update public.profiles
set verification_grace_ends_at = created_at + interval '48 hours'
where verification_grace_ends_at is null;

-- Backfill verificação a partir de e-mail Auth já confirmado
update public.profiles p
set account_verified_at = u.email_confirmed_at
from auth.users u
where u.id = p.id
  and u.email_confirmed_at is not null
  and p.account_verified_at is null;

-- Novos usuários: graça 48h no insert do perfil
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'customer',
    now() + interval '48 hours',
    case when new.email_confirmed_at is not null then new.email_confirmed_at else null end
  )
  on conflict (id) do nothing;

  insert into public.customers (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

-- Helper: precisa confirmar após a graça?
create or replace function public.account_needs_verification(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.account_verified_at is null
      and p.verification_grace_ends_at is not null
      and now() > p.verification_grace_ends_at
  );
$$;

revoke all on function public.account_needs_verification(uuid) from public;
grant execute on function public.account_needs_verification(uuid) to authenticated;

-- Sync quando Auth confirma e-mail (opcional via trigger em auth é restrito; app também sincroniza).
-- Função chamada pelo client após confirmar / refresh.
create or replace function public.mark_account_verified_from_email()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  confirmed_at timestamptz;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select email_confirmed_at into confirmed_at
  from auth.users
  where id = uid;

  if confirmed_at is null then
    return;
  end if;

  update public.profiles
  set account_verified_at = coalesce(account_verified_at, confirmed_at)
  where id = uid
    and account_verified_at is null;
end;
$$;

revoke all on function public.mark_account_verified_from_email() from public;
grant execute on function public.mark_account_verified_from_email() to authenticated;
