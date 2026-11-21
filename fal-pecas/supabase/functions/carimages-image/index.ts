/**
 * FAL — carimages-image (legado / fallback local Vite)
 * Mesmo contrato da Netlify Function: GET CarImages /api/v1/signed-url.
 * Secrets: CARIMAGES_API_KEY (obrigatório) · CARIMAGES_API_SECRET (opcional)
 * Canônico em produção Netlify: /api/carimages-signed-url
 */
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'GET') {
    return json(405, { error: 'method_not_allowed' })
  }

  const apiKey = Deno.env.get('CARIMAGES_API_KEY')?.trim()
  if (!apiKey) {
    return json(503, { error: 'carimages_not_configured' })
  }

  const url = new URL(req.url)
  const make = url.searchParams.get('make')?.trim()
  if (!make) return json(400, { error: 'make_required' })

  const model = url.searchParams.get('model')?.trim() || ''
  const year = url.searchParams.get('year')?.trim() || ''
  const view = url.searchParams.get('view')?.trim() || 'front34'
  const color = url.searchParams.get('color')?.trim() || ''
  const width = url.searchParams.get('width')?.trim() || '800'
  const format = url.searchParams.get('format')?.trim() || 'webp'
  const type = url.searchParams.get('type')?.trim() || ''

  const q = new URLSearchParams()
  q.set('api_key', apiKey)
  q.set('make', make)
  if (model) q.set('model', model)
  if (year) q.set('year', year)
  q.set('view', view)
  if (color) q.set('color', color)
  q.set('width', width)
  q.set('format', format)
  if (type === 'moto') q.set('type', 'moto')
  const apiSecret = Deno.env.get('CARIMAGES_API_SECRET')?.trim()
  if (apiSecret) q.set('api_secret', apiSecret)

  const t0 = Date.now()
  try {
    const upstream = await fetch(`https://carimagesapi.com/api/v1/signed-url?${q}`, {
      headers: { Accept: 'application/json' },
    })
    const body = (await upstream.json().catch(() => null)) as {
      url?: string
      error?: string
      message?: string
    } | null

    if (!upstream.ok || !body?.url) {
      return json(upstream.status >= 400 ? upstream.status : 502, {
        error: 'carimages_upstream',
        detail: body?.error || body?.message || `status_${upstream.status}`,
        ms: Date.now() - t0,
        fallback: true,
      })
    }

    return json(200, {
      url: body.url,
      ms: Date.now() - t0,
      source: 'carimages',
      level: 'family',
      note: 'Ilustrativo de estúdio — não é foto do veículo do cliente',
      fallback: false,
    })
  } catch (e) {
    return json(502, {
      error: 'carimages_upstream',
      detail: e instanceof Error ? e.message : String(e),
      ms: Date.now() - t0,
      fallback: true,
    })
  }
})
