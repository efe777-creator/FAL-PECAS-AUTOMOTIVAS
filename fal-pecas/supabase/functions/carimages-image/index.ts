/**
 * FAL — carimages-image
 * Resolve URL de imagem CarImages server-side (key nunca no Vite).
 * Secrets: CARIMAGES_API_KEY (obrigatório) · CARIMAGES_API_SECRET (opcional signed)
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

  const key = Deno.env.get('CARIMAGES_API_KEY')?.trim()
  if (!key) {
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

  const q = new URLSearchParams()
  q.set('make', make)
  if (model) q.set('model', model)
  if (year) q.set('year', year)
  q.set('view', view)
  if (color) q.set('color', color)
  q.set('width', width)
  q.set('format', format)
  q.set('key', key)

  const imageUrl = `https://carimagesapi.com/image?${q.toString()}`
  const t0 = Date.now()
  try {
    const res = await fetch(imageUrl, { redirect: 'manual' })
    const location = res.headers.get('location')
    const finalUrl = location || imageUrl
    return json(200, {
      url: finalUrl,
      status: res.status,
      ms: Date.now() - t0,
      view: res.headers.get('x-ci-view'),
      color: res.headers.get('x-ci-color'),
      fallback: false,
      source: 'carimages',
      level: 'family',
      note: 'Ilustrativo de estúdio — não é foto do veículo do cliente',
    })
  } catch (e) {
    return json(502, {
      error: 'carimages_upstream',
      detail: e instanceof Error ? e.message : String(e),
    })
  }
})
