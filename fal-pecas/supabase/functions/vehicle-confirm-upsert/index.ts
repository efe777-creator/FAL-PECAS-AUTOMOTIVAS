/**
 * FAL — R4: re-upsert canônico após confirmação humana da placa.
 * Exige JWT de usuário autenticado. Usa service_role só no upsert RPC.
 * Guards R2: maker + model + ano obrigatórios.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import { vehicleCanonicalUpsert } from '../_shared/vehicleCanonicalUpsert.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(500, { error: 'supabase_env_missing' })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json(401, { error: 'unauthorized' })

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) return json(401, { error: 'unauthorized' })

    const body = (await req.json()) as {
      maker?: string
      model?: string
      year?: string | number | null
      engine?: string | null
      version?: string | null
    }

    const maker = String(body.maker ?? '').trim()
    const model = String(body.model ?? '').trim()
    const year = body.year ?? null
    if (!maker || !model) return json(400, { error: 'maker_and_model_required' })
    if (year == null || String(year).trim() === '') {
      return json(400, { error: 'year_required_for_canonical_upsert' })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const upserted = await vehicleCanonicalUpsert(admin, {
      maker,
      model,
      year,
      engine: body.engine ?? null,
      version: body.version ?? null,
      source: 'plate',
    })

    return json(200, {
      ok: true,
      manufacturerId: upserted.manufacturerId,
      modelId: upserted.modelId,
      versionId: upserted.versionId,
      maker: upserted.maker,
      model: upserted.model,
      year: upserted.year,
      engine: upserted.engine,
      version: upserted.version,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'confirm_upsert_failed'
    const status =
      message === 'year_required_for_canonical_upsert' || message === 'maker_and_model_required'
        ? 400
        : 500
    return json(status, { error: message })
  }
})
