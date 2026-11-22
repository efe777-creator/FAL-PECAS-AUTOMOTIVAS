/**
 * Job / webhook de sync do mestre (pórtico FAL).
 * Protegido por header x-fal-sync-secret === VEHICLE_MASTER_SYNC_SECRET.
 * Body: { csvText: string } — dump fipeX. Aplica via service role no futuro;
 * nesta onda documenta contrato e valida secret (apply completo = hub admin).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-fal-sync-secret',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  const expected = Deno.env.get('VEHICLE_MASTER_SYNC_SECRET')?.trim()
  const got = req.headers.get('x-fal-sync-secret')?.trim()
  if (!expected || !got || got !== expected) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let body: { csvText?: string; dryRun?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const csvText = body.csvText?.trim() ?? ''
  if (!csvText) {
    return new Response(
      JSON.stringify({
        ok: false,
        message:
          'Envie csvText (dump fipeX). Apply operacional preferencial via Admin → Integrações. Este endpoint autentica o job.',
        dryRun: true,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // Sanity: projeto linkado
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    return new Response(JSON.stringify({ error: 'missing_supabase_env' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const sb = createClient(url, key)
  const { count, error } = await sb
    .from('models')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      ok: true,
      dryRun: body.dryRun !== false,
      csvBytes: csvText.length,
      modelsActive: count ?? 0,
      message:
        'Secret OK. Apply em massa: use Admin Hub Sincronizar mestre (intelligence + canônico). Cron semanal aponta para este endpoint com CSV hospedado/ops.',
    }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
  )
})
