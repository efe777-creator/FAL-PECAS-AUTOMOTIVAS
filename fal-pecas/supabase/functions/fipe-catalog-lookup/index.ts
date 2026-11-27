/**
 * FAL — proxy FIPE API (staff). Token só no servidor.
 * Secrets: FIPE_API_TOKEN (nunca VITE_)
 * Upstream: https://fipe.parallelum.com.br/api/v2
 */
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UPSTREAM = 'https://fipe.parallelum.com.br/api/v2'
const STAFF_ROLES = new Set(['administrador', 'gerente', 'operador'])

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type Action =
  | { action: 'brands'; vehicleType?: string }
  | { action: 'models'; brandId: string; vehicleType?: string }
  | { action: 'years'; brandId: string; modelId: string; vehicleType?: string }
  | { action: 'detail'; brandId: string; modelId: string; yearId: string; vehicleType?: string }

function vehicleType(raw: string | undefined): string {
  const t = (raw ?? 'cars').trim().toLowerCase()
  if (t === 'motorcycles' || t === 'trucks' || t === 'cars') return t
  return 'cars'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const fipeToken = Deno.env.get('FIPE_API_TOKEN') ?? ''
    if (!supabaseUrl || !anonKey) return json(500, { error: 'supabase_env_missing' })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json(401, { error: 'unauthorized' })

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) return json(401, { error: 'unauthorized' })

    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()
    const role = String(profile?.role ?? '')
    if (!STAFF_ROLES.has(role)) return json(403, { error: 'forbidden' })

    const body = (await req.json()) as Action
    const vt = vehicleType(
      'vehicleType' in body ? (body as { vehicleType?: string }).vehicleType : undefined,
    )

    let path = ''
    if (body.action === 'brands') {
      path = `/${vt}/brands`
    } else if (body.action === 'models') {
      if (!body.brandId) return json(400, { error: 'brand_id_required' })
      path = `/${vt}/brands/${encodeURIComponent(body.brandId)}/models`
    } else if (body.action === 'years') {
      if (!body.brandId || !body.modelId) return json(400, { error: 'brand_model_required' })
      path = `/${vt}/brands/${encodeURIComponent(body.brandId)}/models/${encodeURIComponent(body.modelId)}/years`
    } else if (body.action === 'detail') {
      if (!body.brandId || !body.modelId || !body.yearId) {
        return json(400, { error: 'brand_model_year_required' })
      }
      path = `/${vt}/brands/${encodeURIComponent(body.brandId)}/models/${encodeURIComponent(body.modelId)}/years/${encodeURIComponent(body.yearId)}`
    } else {
      return json(400, { error: 'invalid_action' })
    }

    const headers: Record<string, string> = { Accept: 'application/json' }
    if (fipeToken) headers['X-Subscription-Token'] = fipeToken

    const upstream = await fetch(`${UPSTREAM}${path}`, { headers })
    const text = await upstream.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      return json(502, { error: 'upstream_invalid_json', status: upstream.status })
    }
    if (!upstream.ok) {
      return json(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502, {
        error: 'upstream_error',
        status: upstream.status,
        detail: data,
      })
    }
    return json(200, { ok: true, data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'fipe_lookup_failed'
    return json(500, { error: message })
  }
})
