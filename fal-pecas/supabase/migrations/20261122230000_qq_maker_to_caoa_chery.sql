-- QQ (Chery) estava sob Audi por lixo de import — quarentena permanece; só corrige maker.

update public.models m
set
  manufacturer_id = mk.id,
  review_note = coalesce(
    nullif(trim(m.review_note), ''),
    'Inactive legado / duplicata — quarentena'
  ) || ' · maker corrigido Audi→CAOA Chery'
from public.manufacturers mk
where m.name = 'QQ'
  and m.quality_status = 'quarantined'
  and mk.name = 'CAOA Chery'
  and m.manufacturer_id is distinct from mk.id;
