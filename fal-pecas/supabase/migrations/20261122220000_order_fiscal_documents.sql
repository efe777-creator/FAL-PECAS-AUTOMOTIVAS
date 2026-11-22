-- #14 M4: NF manual via camada evolutiva (arquivo + número + audit).
-- source = manual hoje; futuro emissor não quebra o contrato.

create table if not exists public.order_fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  document_number text,
  issued_at date,
  storage_path text not null,
  mime_type text,
  file_name text,
  source text not null default 'manual'
    check (source in ('manual', 'issuer')),
  replaced_by uuid references public.order_fiscal_documents (id),
  is_current boolean not null default true,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists order_fiscal_documents_order_id_idx
  on public.order_fiscal_documents (order_id);

create index if not exists order_fiscal_documents_current_idx
  on public.order_fiscal_documents (order_id)
  where is_current;

comment on table public.order_fiscal_documents is
  'Documentos fiscais do pedido. Anexo manual (#14); source issuer reservado ao emissor futuro.';

alter table public.order_fiscal_documents enable row level security;

drop policy if exists ofd_select_own_or_staff on public.order_fiscal_documents;
create policy ofd_select_own_or_staff on public.order_fiscal_documents
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.customer_id = public.current_customer_id()
    )
  );

drop policy if exists ofd_insert_staff on public.order_fiscal_documents;
create policy ofd_insert_staff on public.order_fiscal_documents
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists ofd_update_staff on public.order_fiscal_documents;
create policy ofd_update_staff on public.order_fiscal_documents
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

revoke all on public.order_fiscal_documents from public;
grant select on public.order_fiscal_documents to authenticated;
grant insert, update on public.order_fiscal_documents to authenticated;

-- Storage privado
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-fiscal-documents',
  'order-fiscal-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ofd_storage_select on storage.objects;
create policy ofd_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'order-fiscal-documents'
    and (
      public.is_staff()
      or exists (
        select 1
        from public.order_fiscal_documents d
        join public.orders o on o.id = d.order_id
        where d.storage_path = name
          and o.customer_id = public.current_customer_id()
      )
    )
  );

drop policy if exists ofd_storage_insert on storage.objects;
create policy ofd_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'order-fiscal-documents'
    and public.is_staff()
  );

drop policy if exists ofd_storage_update on storage.objects;
create policy ofd_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'order-fiscal-documents' and public.is_staff())
  with check (bucket_id = 'order-fiscal-documents' and public.is_staff());

-- RPC: anexar (marca anteriores como não atuais)
create or replace function public.admin_attach_order_fiscal_document(
  p_order_id uuid,
  p_storage_path text,
  p_document_number text default null,
  p_issued_at date default null,
  p_mime_type text default null,
  p_file_name text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_prev uuid;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'not authorized';
  end if;
  if p_order_id is null or nullif(trim(p_storage_path), '') is null then
    raise exception 'order_id and storage_path required';
  end if;
  if not exists (select 1 from public.orders o where o.id = p_order_id) then
    raise exception 'order not found';
  end if;

  select d.id into v_prev
  from public.order_fiscal_documents d
  where d.order_id = p_order_id and d.is_current
  order by d.created_at desc
  limit 1;

  if v_prev is not null then
    update public.order_fiscal_documents
    set is_current = false
    where id = v_prev;
  end if;

  insert into public.order_fiscal_documents (
    order_id, document_number, issued_at, storage_path, mime_type, file_name,
    source, replaced_by, is_current, uploaded_by
  ) values (
    p_order_id,
    nullif(trim(coalesce(p_document_number, '')), ''),
    p_issued_at,
    trim(p_storage_path),
    nullif(trim(coalesce(p_mime_type, '')), ''),
    nullif(trim(coalesce(p_file_name, '')), ''),
    'manual',
    null,
    true,
    auth.uid()
  )
  returning id into v_id;

  if v_prev is not null then
    update public.order_fiscal_documents
    set replaced_by = v_id
    where id = v_prev;
  end if;

  insert into public.order_events (order_id, event_type, payload, visibility, created_by)
  values (
    p_order_id,
    'fiscal_document_attached',
    jsonb_build_object(
      'document_id', v_id,
      'document_number', nullif(trim(coalesce(p_document_number, '')), ''),
      'source', 'manual',
      'replaced', v_prev is not null
    ),
    'staff',
    auth.uid()
  );

  return v_id;
end;
$$;

revoke all on function public.admin_attach_order_fiscal_document(uuid, text, text, date, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_attach_order_fiscal_document(uuid, text, text, date, text, text)
  to authenticated, service_role;
