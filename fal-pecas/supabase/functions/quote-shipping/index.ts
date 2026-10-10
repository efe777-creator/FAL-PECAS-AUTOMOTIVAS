/**
 * FAL — quote-shipping (esqueleto live)
 *
 * Camada B/C: cotação server-side para Correios (e futuros carriers).
 * Secrets: CORREIOS_USER / CORREIOS_TOKEN (nunca VITE_).
 *
 * Estado atual: estrutura + roteamento; live Correios HTTP ainda NÃO implementada.
 * Retorna 501 not_configured até D-FRETE C + MARCHA de integração autorizada.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

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

type QuoteItem = {
  productId?: string
  quantity?: number
  weightKg?: number | null
  heightCm?: number | null
  widthCm?: number | null
  lengthCm?: number | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !anonKey) return json(500, { error: 'supabase_env_missing' })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json(401, { error: 'missing_authorization' })

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()
    if (userErr || !user) return json(401, { error: 'unauthorized' })

    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return json(400, { error: 'invalid_json' })
    }

    const postalCode = String(body.postalCode ?? '').replace(/\D/g, '')
    if (postalCode.length !== 8) {
      return json(400, {
        status: 'invalid_cep',
        providerId: 'correios',
        mode: 'live',
        options: [],
        message: 'CEP inválido',
        quotedAt: new Date().toISOString(),
      })
    }

    const provider = String(body.provider ?? 'correios').toLowerCase()
    const items = (Array.isArray(body.items) ? body.items : []) as QuoteItem[]
    const missingWeight = items.filter((i) => i.weightKg == null || !(Number(i.weightKg) > 0))
    if (items.length && missingWeight.length === items.length) {
      return json(422, {
        status: 'missing_logistics',
        providerId: provider,
        mode: 'live',
        options: [],
        message: 'Peso dos itens ausente — cotação live recusada (sem inventar defaults)',
        quotedAt: new Date().toISOString(),
      })
    }

    if (provider === 'correios') {
      const userCorreios = Deno.env.get('CORREIOS_USER')
      const tokenCorreios = Deno.env.get('CORREIOS_TOKEN')
      if (!userCorreios || !tokenCorreios) {
        return json(501, {
          status: 'not_configured',
          providerId: 'correios',
          mode: 'live',
          options: [],
          message:
            'CORREIOS_USER/CORREIOS_TOKEN ausentes no Edge. Configure secrets após D-FRETE C.',
          quotedAt: new Date().toISOString(),
        })
      }
      // Slot live: autenticação/token + cálculo PAC/SEDEX entram na MARCHA Correios produção.
      return json(501, {
        status: 'not_configured',
        providerId: 'correios',
        mode: 'live',
        options: [],
        message:
          'Integração HTTP Correios ainda não habilitada (esqueleto quote-shipping pronto).',
        quotedAt: new Date().toISOString(),
      })
    }

    if (provider === 'carrier' || provider === 'frenet') {
      return json(501, {
        status: 'not_configured',
        providerId: provider,
        mode: 'stub',
        options: [],
        message: `Provedor ${provider} reservado — MARCHA própria futura.`,
        quotedAt: new Date().toISOString(),
      })
    }

    return json(400, { error: 'unknown_provider', provider })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'quote_shipping_error'
    return json(500, { error: 'internal', message })
  }
})
