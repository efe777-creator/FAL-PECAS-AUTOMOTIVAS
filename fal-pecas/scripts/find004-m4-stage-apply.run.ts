/**
 * FIND-004 MARCHA 4 — gera SQL de staging + apply (wtbp).
 * Política: stage todas as linhas; RPC pula review/error.
 * Uso:
 *   npx vite-node scripts/find004-m4-stage-apply.run.ts
 *   npx supabase db query --linked -f scripts/find004-m4-stage-apply.sql
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  analyzeApplicationMappedRows,
  previewRowToFrozenPayload,
  type ApplicationCatalogs,
} from '../src/services/import/applicationImportCore'

function loadCatalog(rawPath: string): ApplicationCatalogs {
  const text = readFileSync(rawPath, 'utf8')
  const start = text.indexOf('{')
  const json = JSON.parse(text.slice(start)) as {
    rows: Array<{
      catalog: {
        products: Array<{ id: string; sku: string; name: string }>
        makers: Array<{ id: string; name: string }>
        models: Array<{ id: string; manufacturerId: string; name: string }>
        versions: Array<{
          id: string
          manufacturerId: string
          modelId: string
          versionName: string | null
        }>
        pvc: Array<{
          productId: string
          vehicleVersionId: string
          yearStart: number | null
          yearEnd: number | null
        }>
      }
    }>
  }
  const c = json.rows[0].catalog
  const productsBySku = new Map<string, { id: string; name: string }>()
  for (const p of c.products) {
    productsBySku.set(p.sku.toLowerCase(), { id: p.id, name: p.name })
  }
  return {
    productsBySku,
    makers: c.makers,
    models: c.models,
    versions: c.versions,
    pvc: c.pvc,
  }
}

function parseCsv(path: string): Array<{ lineNumber: number; values: Record<string, string> }> {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const header = lines[0].split(';').map((h) => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)
  const rows: Array<{ lineNumber: number; values: Record<string, string> }> = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';')
    rows.push({
      lineNumber: i + 1,
      values: {
        sku: cols[idx('codigo_fal')] ?? '',
        name: '',
        montadora: cols[idx('montadora')] ?? '',
        modelo: cols[idx('modelo')] ?? '',
        versao: cols[idx('versao')] ?? '',
        ano_inicio: cols[idx('ano_inicio')] ?? '',
        ano_fim: cols[idx('ano_fim')] ?? '',
      },
    })
  }
  return rows
}

const root = resolve(import.meta.dirname, '../..')
const csvPath = resolve(root, 'ARQUIVOS IMPORTAÇÕES', 'LISTA SUSP. aplicação FAL.csv')
const catalogPath = resolve(import.meta.dirname, 'find004-catalog-raw.json')
const sqlOut = resolve(import.meta.dirname, 'find004-m4-stage-apply.sql')
const metaOut = resolve(import.meta.dirname, 'find004-m4-meta.json')
const ADMIN = 'ddb45683-34bf-4596-93c4-4676f423e5d4'

const catalog = loadCatalog(catalogPath)
const preview = analyzeApplicationMappedRows(parseCsv(csvPath), catalog)

const report = {
  total: preview.length,
  applyable: preview.filter((r) => r.applyable).length,
  review: preview.filter((r) => r.action === 'review').length,
  error: preview.filter((r) => r.action === 'error').length,
  already_covered: preview.filter((r) => r.action === 'already_covered').length,
  new: preview.filter((r) => r.action === 'new').length,
  update: preview.filter((r) => r.action === 'update').length,
  createVersion: preview.filter((r) => r.createVersion).length,
}

const payloadsJson = JSON.stringify(
  preview.map((r) => ({
    line_number: r.lineNumber,
    errors: r.action === 'error' ? [r.message] : [],
    warnings: r.action === 'review' ? [r.message] : [],
    payload: previewRowToFrozenPayload(r),
    result: r.action === 'error' ? 'error' : 'ok',
  })),
).replace(/'/g, "''")

const reportJson = JSON.stringify(report).replace(/'/g, "''")

const sql = `-- FIND-004 MARCHA 4 — stage + apply (gerado)
-- Política: stage completo; RPC pula review/error.

do $m4$
declare
  v_admin uuid := '${ADMIN}'::uuid;
  v_import_id uuid;
  v_result jsonb;
  v_pvc_before int;
  v_pvc_after int;
  v_vv_before int;
  v_vv_after int;
  v_item jsonb;
begin
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text,
    true
  );

  if auth.uid() is distinct from v_admin then
    raise exception 'M4: auth.uid inválido';
  end if;
  if not public.staff_can_import_catalog() then
    raise exception 'M4: staff_can_import_catalog=false';
  end if;

  select count(*)::int into v_pvc_before from public.product_vehicle_compatibility;
  select count(*)::int into v_vv_before from public.vehicle_versions where status = 'active';

  insert into public.imports (filename, status, kind, created_by, report)
  values (
    'FIND004-M4 LISTA SUSP. aplicação FAL.csv',
    'preview',
    'catalog_applications',
    v_admin,
    '${reportJson}'::jsonb
  )
  returning id into v_import_id;

  for v_item in
    select * from jsonb_array_elements('${payloadsJson}'::jsonb)
  loop
    insert into public.import_items (
      import_id, line_number, errors, warnings, payload, result
    ) values (
      v_import_id,
      (v_item ->> 'line_number')::int,
      coalesce(
        (select array_agg(x) from jsonb_array_elements_text(coalesce(v_item -> 'errors', '[]'::jsonb)) as t(x)),
        '{}'::text[]
      ),
      coalesce(
        (select array_agg(x) from jsonb_array_elements_text(coalesce(v_item -> 'warnings', '[]'::jsonb)) as t(x)),
        '{}'::text[]
      ),
      v_item -> 'payload',
      coalesce(v_item ->> 'result', 'ok')
    );
  end loop;

  v_result := public.apply_catalog_applications_import(v_import_id);

  select count(*)::int into v_pvc_after from public.product_vehicle_compatibility;
  select count(*)::int into v_vv_after from public.vehicle_versions where status = 'active';

  update public.imports
  set report = coalesce(report, '{}'::jsonb) || jsonb_build_object(
    'm4_evidence',
    jsonb_build_object(
      'pvc_before', v_pvc_before,
      'pvc_after', v_pvc_after,
      'pvc_delta', v_pvc_after - v_pvc_before,
      'vv_before', v_vv_before,
      'vv_after', v_vv_after,
      'vv_delta', v_vv_after - v_vv_before,
      'apply_result', v_result,
      'policy', 'stage all; RPC skips review/error'
    )
  )
  where id = v_import_id;
end;
$m4$;

select
  id as import_id,
  status,
  report -> 'm4_evidence' as m4_evidence,
  report -> 'total' as staged_total,
  report -> 'applyable' as staged_applyable
from public.imports
where filename = 'FIND004-M4 LISTA SUSP. aplicação FAL.csv'
order by created_at desc
limit 1;
`

writeFileSync(sqlOut, sql, 'utf8')
writeFileSync(
  metaOut,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      admin: ADMIN,
      report,
      sqlOut,
      policy: 'stage all; RPC skips review/error; applyable writes PVC/VV',
    },
    null,
    2,
  ),
  'utf8',
)
console.log(JSON.stringify({ metaOut, sqlOut, report, sqlBytes: sql.length }, null, 2))
