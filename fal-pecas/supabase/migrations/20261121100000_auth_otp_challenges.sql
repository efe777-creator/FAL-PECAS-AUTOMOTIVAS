-- OTP WhatsApp: desafios de confirmação de conta e recuperação de senha.
-- Acesso só via Edge (service_role). Client nunca lê a tabela.

create table if not exists public.auth_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users (id) on delete cascade,
  phone_e164 text not null,
  purpose text not null check (purpose in ('account_verify', 'password_reset')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  max_attempts int not null default 5,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists auth_otp_challenges_phone_purpose_alive_idx
  on public.auth_otp_challenges (phone_e164, purpose, created_at desc)
  where consumed_at is null;

create index if not exists auth_otp_challenges_user_purpose_alive_idx
  on public.auth_otp_challenges (user_id, purpose, created_at desc)
  where consumed_at is null and user_id is not null;

comment on table public.auth_otp_challenges is
  'OTP WhatsApp (hash). service_role only — Edge send/verify-auth-otp.';

alter table public.auth_otp_challenges enable row level security;

revoke all on table public.auth_otp_challenges from anon, authenticated;
-- service_role bypassa RLS

-- Marca telefone + conta verificados (chamado pela Edge após OTP ok).
create or replace function public.mark_account_verified_from_phone(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null then
    raise exception 'user required';
  end if;

  update public.profiles
  set
    phone_verified_at = coalesce(phone_verified_at, now()),
    account_verified_at = coalesce(account_verified_at, now())
  where id = p_user_id;
end;
$$;

revoke all on function public.mark_account_verified_from_phone(uuid) from public;
-- só service_role / edge
grant execute on function public.mark_account_verified_from_phone(uuid) to service_role;
