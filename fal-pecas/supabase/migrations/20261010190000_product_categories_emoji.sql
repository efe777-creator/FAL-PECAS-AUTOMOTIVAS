-- Ícone/emoji editável na classificação (Grupo / Categoria / Subcategoria).
-- Valores: emoji unicode ou chave de asset "img:suspensao|freios|filtros".

alter table public.product_categories
  add column if not exists emoji text;

comment on column public.product_categories.emoji is
  'Ícone da vitrine: emoji unicode ou img:suspensao|img:freios|img:filtros. Vazio = resolver por slug/nome.';
