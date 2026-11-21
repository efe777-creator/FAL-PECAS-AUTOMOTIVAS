import type { Config, Context } from '@netlify/functions'
import {
  buildCarImagesSignedUrlQuery,
  CARIMAGES_SIGNED_URL_ENDPOINT,
} from '../../src/services/garage/adapters/carImagesSignedUrl'

/**
 * G3 — stock 2D CarImages via signed URL.
 * Key/secret só em env Netlify (Netlify.env.get). Nunca ecoa a key.
 */
export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    })
  }
  if (req.method !== 'GET') {
    return json(405, { error: 'method_not_allowed' })
  }

  const apiKey = Netlify.env.get('CARIMAGES_API_KEY')?.trim()
  if (!apiKey) {
    return json(503, { error: 'carimages_not_configured' })
  }

  const url = new URL(req.url)
  const make = url.searchParams.get('make')?.trim()
  if (!make) return json(400, { error: 'make_required' })

  const q = buildCarImagesSignedUrlQuery({
    make,
    model: url.searchParams.get('model'),
    year: url.searchParams.get('year'),
    view: url.searchParams.get('view') || 'front34',
    color: url.searchParams.get('color'),
    width: url.searchParams.get('width') || '800',
    format: url.searchParams.get('format') || 'webp',
    type: url.searchParams.get('type') === 'moto' ? 'moto' : null,
  })
  q.set('api_key', apiKey)
  const apiSecret = Netlify.env.get('CARIMAGES_API_SECRET')?.trim()
  if (apiSecret) q.set('api_secret', apiSecret)

  const t0 = Date.now()
  try {
    const upstream = await fetch(`${CARIMAGES_SIGNED_URL_ENDPOINT}?${q.toString()}`, {
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
    })
  }
}

export const config: Config = {
  path: '/api/carimages-signed-url',
  method: ['GET', 'OPTIONS'],
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
