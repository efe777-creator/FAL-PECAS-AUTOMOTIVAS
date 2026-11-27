/**
 * FAL — R4: re-upsert canônico após confirmação humana da placa.
 * Exige JWT. Grava via service_role no RPC.
 * Fase 2: staff OU cliente com placa coerente com cache recente (não basta JWT genérico).
 */
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import { vehicleCanonicalUpsert } from '../_shared/vehicleCanonicalUpsert.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STAFF_ROLES = new Set([
  'administrador',
  'gerente',
  'operador',
  'estoque',
  'atendimento',
])

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function fold(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function modelsCompatible(confirmed: string, cached: string): boolean {
  const a = fold(confirmed)
  const b = fold(cached)
  if (!a || !b) return false
  return a === b || a.startsWith(b) || b.startsWith(a)
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
      plate?: string | null
    }

    const maker = String(body.maker ?? '').trim()
    const model = String(body.model ?? '').trim()
    const year = body.year ?? null
    if (!maker || !model) return json(400, { error: 'maker_and_model_required' })
    if (year == null || String(year).trim() === '') {
      return json(400, { error: 'year_required_for_canonical_upsert' })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()
    const role = String((profile as { role?: string } | null)?.role ?? '')
    const isStaff = STAFF_ROLES.has(role)

    if (!isStaff) {
      const plateRaw = String(body.plate ?? '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
      if (!plateRaw) {
        return json(403, { error: 'plate_required_for_customer_confirm' })
      }
      const { data: cached, error: cacheErr } = await admin
        .from('cached_plates')
        .select('plate, payload, updated_at, expires_at')
        .eq('plate', plateRaw)
        .maybeSingle()
      if (cacheErr || !cached) {
        return json(403, { error: 'plate_lookup_required_before_confirm' })
      }
      const expiresAt = new Date(String((cached as { expires_at?: string }).expires_at ?? 0))
      if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
        return json(403, { error: 'plate_lookup_expired' })
      }
      const payload = (cached as { payload?: Record<string, unknown> }).payload ?? {}
      const nested = payload.vehicle
      const vehicle =
        nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : null
      const pick = (key: string) => {
        const fromVehicle = vehicle?.[key]
        if (fromVehicle != null && String(fromVehicle).trim() !== '') return String(fromVehicle)
        const fromRoot = payload[key]
        return fromRoot == null ? '' : String(fromRoot)
      }
      const cacheMaker = fold(pick('maker'))
      const cacheModel = fold(pick('model'))
      const cacheYear = pick('year').trim()
      if (fold(maker) !== cacheMaker || !modelsCompatible(model, cacheModel)) {
        return json(403, { error: 'plate_confirm_mismatch' })
      }
      if (cacheYear && String(year).trim() !== cacheYear) {
        return json(403, { error: 'plate_confirm_year_mismatch' })
      }
    }

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
