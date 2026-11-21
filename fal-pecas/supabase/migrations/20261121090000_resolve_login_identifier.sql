-- Resolve e-mail a partir de username (ou devolve e-mail normalizado).
-- SECURITY DEFINER: client não faz lookup direto em auth.users / profiles para login.
-- Resposta nula = identificador inexistente (client trata como credencial inválida uniforme).

create or replace function public.resolve_login_identifier(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_raw text := lower(trim(coalesce(p_identifier, '')));
  v_email text;
begin
  if v_raw = '' then
    return null;
  end if;

  if position('@' in v_raw) > 0 then
    return v_raw;
  end if;

  select u.email
    into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username is not null
    and lower(p.username) = v_raw
    and p.deleted_at is null
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_login_identifier(text) from public;
grant execute on function public.resolve_login_identifier(text) to anon, authenticated;

comment on function public.resolve_login_identifier(text) is
  'Login: resolve username → e-mail Auth. Sem enumeração amigável no client.';
