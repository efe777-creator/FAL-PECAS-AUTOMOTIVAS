-- Remapeia products.category_id da raiz DIREÇÃO para grupos/subgrupos
-- publicados, com base no nome/descrição do produto.
-- Não altera a RPC search_products (já resolve ancestral + filhos).

-- DIREÇÃO → folhas
update public.products p
set category_id = c.id, updated_at = now()
from public.product_categories c
where c.slug = 'terminal-de-direcao'
  and p.status = 'published'
  and p.category_id = (select id from public.product_categories where slug = 'direcao')
  and upper(public.f_unaccent(p.name)) = upper(public.f_unaccent('TERMINAL DE DIREÇÃO'));

update public.products p
set category_id = c.id, updated_at = now()
from public.product_categories c
where c.slug = 'axial-de-direcao'
  and p.status = 'published'
  and p.category_id = (select id from public.product_categories where slug = 'direcao')
  and upper(public.f_unaccent(p.name)) = upper(public.f_unaccent('AXIAL DE DIREÇÃO'));

-- SUSPENSÃO — grupos
update public.products p
set category_id = c.id, updated_at = now()
from public.product_categories c
where c.slug = 'pivo'
  and p.status = 'published'
  and p.category_id = (select id from public.product_categories where slug = 'direcao')
  and upper(public.f_unaccent(p.name)) in ('PIVO', 'PIVÔ');

update public.products p
set category_id = c.id, updated_at = now()
from public.product_categories c
where c.slug = 'bieleta'
  and p.status = 'published'
  and p.category_id = (select id from public.product_categories where slug = 'direcao')
  and upper(public.f_unaccent(p.name)) = 'BIELETA';

update public.products p
set category_id = c.id, updated_at = now()
from public.product_categories c
where c.slug = 'bucha-bandeja'
  and p.status = 'published'
  and p.category_id = (select id from public.product_categories where slug = 'direcao')
  and upper(public.f_unaccent(p.name)) like 'BUCHA%BANDEJA%';

update public.products p
set category_id = c.id, updated_at = now()
from public.product_categories c
where c.slug = 'suporte-da-barra-tensora'
  and p.status = 'published'
  and p.category_id = (select id from public.product_categories where slug = 'direcao')
  and upper(public.f_unaccent(p.name)) like 'SUPORTE DA BARRA TENSORA%';

-- COXIM: C/ROLAMENTO → subgrupo; demais → grupo coxim
update public.products p
set category_id = c.id, updated_at = now()
from public.product_categories c
where c.slug = 'c-rolamento'
  and p.status = 'published'
  and p.category_id = (select id from public.product_categories where slug = 'direcao')
  and upper(public.f_unaccent(p.name)) = 'COXIM AMORTECEDOR'
  and (
    upper(coalesce(p.description, '')) like '%C/ROLAMENTO%'
    or upper(coalesce(p.short_description, '')) like '%C/ROLAMENTO%'
  );

update public.products p
set category_id = c.id, updated_at = now()
from public.product_categories c
where c.slug = 'coxim-amortecedor'
  and p.status = 'published'
  and p.category_id = (select id from public.product_categories where slug = 'direcao')
  and upper(public.f_unaccent(p.name)) = 'COXIM AMORTECEDOR';

-- KIT AMORTECEDOR → subgrupos por descrição
update public.products p
set category_id = c.id, updated_at = now()
from public.product_categories c
where c.slug = 'batente-e-loclizador'
  and p.status = 'published'
  and p.category_id = (select id from public.product_categories where slug = 'direcao')
  and upper(public.f_unaccent(p.name)) = 'KIT AMORTECEDOR'
  and (
    upper(coalesce(p.description, '')) like '%BATENTE%'
    or upper(coalesce(p.short_description, '')) like '%BATENTE%'
  );

update public.products p
set category_id = c.id, updated_at = now()
from public.product_categories c
where c.slug = 'par-parcial'
  and p.status = 'published'
  and p.category_id = (select id from public.product_categories where slug = 'direcao')
  and upper(public.f_unaccent(p.name)) = 'KIT AMORTECEDOR'
  and (
    upper(coalesce(p.description, '')) like 'PAR %'
    or upper(coalesce(p.short_description, '')) like 'PAR %'
  );

update public.products p
set category_id = c.id, updated_at = now()
from public.product_categories c
where c.slug = 'completo'
  and p.status = 'published'
  and p.category_id = (select id from public.product_categories where slug = 'direcao')
  and upper(public.f_unaccent(p.name)) = 'KIT AMORTECEDOR';
