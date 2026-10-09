select set_config('request.jwt.claim.sub', 'ddb45683-34bf-4596-93c4-4676f423e5d4', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"ddb45683-34bf-4596-93c4-4676f423e5d4","role":"authenticated"}',
  true
);
select auth.uid() as uid, public.staff_can_import_catalog() as can_import;
