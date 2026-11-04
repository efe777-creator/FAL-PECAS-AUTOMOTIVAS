/**
 * FAL — quote-shipping
 *
 * Providers:
 * - correios: esqueleto live (501 até HTTP Correios)
 * - melhorenvio: calculate sandbox + persiste shipping_quotes (meq:)
 *
 * Secrets ME: MELHOR_ENVIO_TOKEN, MELHOR_ENVIO_USER_AGENT (nunca VITE_).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ME_SANDBOX_BASE = 'https://sandbox.melhorenvio.com.br'

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

function fingerprint(input: {
  postalCode: string
  originPostalCode: string
  subtotal: number
  itemCount: number
  items: QuoteItem[]
}): string {
  const items = input.items
    .map((i) =>
      [
        i.productId ?? '',
        i.quantity ?? 1,
        i.weightKg ?? '',
        i.heightCm ?? '',
        i.widthCm ?? '',
        i.lengthCm ?? '',
      ].join(':'),
    )
    .sort()
    .join('|')
  return [
    input.originPostalCode,
    input.postalCode,
    input.subtotal.toFixed(2),
    input.itemCount,
    items,
  ].join('::')
}

function meHeaders(token: string, ua: string): Record<string, string> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'User-Agent': ua,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
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
        providerId: String(body.provider ?? 'correios'),
        mode: 'live',
        options: [],
        message: 'CEP inválido',
        quotedAt: new Date().toISOString(),
      })
    }

    const provider = String(body.provider ?? 'correios').toLowerCase()
    const items = (Array.isArray(body.items) ? body.items : []) as QuoteItem[]
    const subtotal = Number(body.subtotal ?? 0)
    const itemCount = Number(body.itemCount ?? items.reduce((n, i) => n + (i.quantity ?? 1), 0))
    const quotedAt = new Date().toISOString()

    const missingWeight = items.filter((i) => i.weightKg == null || !(Number(i.weightKg) > 0))
    if (items.length && missingWeight.length === items.length) {
      return json(422, {
        status: 'missing_logistics',
        providerId: provider,
        mode: 'live',
        options: [],
        message: 'Peso dos itens ausente — cotação live recusada (sem inventar defaults)',
        quotedAt,
      })
    }

    if (provider === 'melhorenvio') {
      const meToken = Deno.env.get('MELHOR_ENVIO_TOKEN')
      const meUa = Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'FAL Pecas (sandbox)'
      if (!meToken) {
        return json(501, {
          status: 'not_configured',
          providerId: 'melhorenvio',
          mode: 'live',
          options: [],
          message: 'MELHOR_ENVIO_TOKEN ausente no Edge. Configure secrets sandbox.',
          quotedAt,
        })
      }
      if (!serviceKey) return json(500, { error: 'supabase_service_role_missing' })

      const admin = createClient(supabaseUrl, serviceKey)

      const missingDims = items.filter(
        (i) =>
          !(Number(i.heightCm) > 0) ||
          !(Number(i.widthCm) > 0) ||
          !(Number(i.lengthCm) > 0) ||
          !(Number(i.weightKg) > 0),
      )
      if (items.length === 0 || missingDims.length > 0) {
        return json(422, {
          status: 'missing_logistics',
          providerId: 'melhorenvio',
          mode: 'live',
          options: [],
          message:
            'Peso/dimensões incompletos — cotação Melhor Envio recusada (sem inventar defaults).',
          quotedAt,
        })
      }

      const { data: origin } = await admin
        .from('store_shipping_origin')
        .select('postal_code')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      const originPostal =
        String(body.originPostalCode ?? origin?.postal_code ?? '')
          .replace(/\D/g, '')
          .slice(0, 8) || ''
      if (originPostal.length !== 8) {
        return json(422, {
          status: 'not_configured',
          providerId: 'melhorenvio',
          mode: 'live',
          options: [],
          message: 'CEP de origem da loja ausente (store_shipping_origin).',
          quotedAt,
        })
      }

      let weightSum = 0
      let maxH = 0
      let maxW = 0
      let maxL = 0
      const products = items.map((it, idx) => {
        const qty = Math.max(1, Number(it.quantity ?? 1))
        const w = Number(it.weightKg)
        const h = Number(it.heightCm)
        const wi = Number(it.widthCm)
        const le = Number(it.lengthCm)
        weightSum += w * qty
        maxH = Math.max(maxH, h)
        maxW = Math.max(maxW, wi)
        maxL = Math.max(maxL, le)
        const share = subtotal > 0 ? (subtotal * (w * qty)) / Math.max(weightSum, 0.001) : 0
        return {
          id: String(it.productId ?? idx + 1),
          width: wi,
          height: h,
          length: le,
          weight: w,
          insurance_value: Number((share || subtotal / items.length || 1).toFixed(2)),
          quantity: qty,
        }
      })
      // Recalcula insurance rateado pelo peso após soma final
      const productsFinal = items.map((it, idx) => {
        const qty = Math.max(1, Number(it.quantity ?? 1))
        const w = Number(it.weightKg)
        const share = weightSum > 0 ? (subtotal * (w * qty)) / weightSum : subtotal / items.length
        return {
          ...products[idx]!,
          insurance_value: Number(Math.max(1, share).toFixed(2)),
        }
      })

      const meRes = await fetch(`${ME_SANDBOX_BASE}/api/v2/me/shipment/calculate`, {
        method: 'POST',
        headers: meHeaders(meToken, meUa),
        body: JSON.stringify({
          from: { postal_code: originPostal },
          to: { postal_code: postalCode },
          products: productsFinal,
        }),
      })
      const meData = await meRes.json().catch(() => null)
      if (!meRes.ok) {
        return json(502, {
          status: 'provider_error',
          providerId: 'melhorenvio',
          mode: 'live',
          options: [],
          message: `Melhor Envio calculate HTTP ${meRes.status}`,
          quotedAt,
        })
      }
      const rawList = Array.isArray(meData) ? meData : []
      const services = rawList.filter(
        (row) => row && typeof row === 'object' && !(row as { error?: unknown }).error,
      ) as Array<Record<string, unknown>>

      if (!services.length) {
        return json(200, {
          status: 'unavailable',
          providerId: 'melhorenvio',
          mode: 'live',
          options: [],
          message: 'Nenhuma opção Melhor Envio disponível para este CEP',
          quotedAt,
        })
      }

      const { data: cust } = await admin
        .from('customers')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle()

      const fp = fingerprint({
        postalCode,
        originPostalCode: originPostal,
        subtotal,
        itemCount,
        items,
      })
      const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString()
      const volumes = {
        weightKg: weightSum,
        heightCm: maxH,
        widthCm: maxW,
        lengthCm: maxL,
      }

      const optionsPayload = services.map((s) => {
        const serviceId = Number(s.id)
        const price = Number(s.custom_price ?? s.price ?? 0)
        const range = (s.custom_delivery_range ?? s.delivery_range ?? {}) as {
          min?: number
          max?: number
        }
        return {
          service_id: serviceId,
          name: String(s.name ?? `Serviço ${serviceId}`),
          amount: price,
          eta_days_min: Number(range.min ?? s.custom_delivery_time ?? s.delivery_time ?? 0),
          eta_days_max: Number(range.max ?? s.custom_delivery_time ?? s.delivery_time ?? 0),
          packages: s.packages ?? null,
          company: s.company ?? null,
        }
      })

      const { data: quoteRow, error: quoteErr } = await admin
        .from('shipping_quotes')
        .insert({
          customer_id: cust?.id ?? null,
          provider: 'melhorenvio',
          request_fingerprint: fp,
          postal_code: postalCode,
          options: optionsPayload,
          volumes,
          origin_postal_code: originPostal,
          expires_at: expiresAt,
        })
        .select('id')
        .single()

      if (quoteErr || !quoteRow) {
        // Tabela pode não existir ainda — devolve opções sem persistência (place_order meq falhará até migration)
        console.error('shipping_quotes_insert_failed', quoteErr?.message)
        return json(200, {
          status: 'ok',
          providerId: 'melhorenvio',
          mode: 'live',
          options: optionsPayload.map((o) => ({
            id: `meq:ephemeral:${o.service_id}`,
            provider: 'melhorenvio',
            serviceCode: String(o.service_id),
            label: o.name,
            amount: o.amount,
            etaDaysMin: o.eta_days_min,
            etaDaysMax: o.eta_days_max,
            metadata: { ephemeral: true, volumes, warning: 'shipping_quotes_unavailable' },
          })),
          quotedAt,
          expiresAt,
          message: quoteErr
            ? 'Cotação ME ok, mas shipping_quotes indisponível (aplique migration).'
            : undefined,
          disclaimer:
            'Cotação Melhor Envio sandbox. Não é frete de produção até D-FRETE C.',
        })
      }

      const quoteId = String(quoteRow.id)
      const options = optionsPayload.map((o) => ({
        id: `meq:${quoteId}:${o.service_id}`,
        provider: 'melhorenvio',
        serviceCode: String(o.service_id),
        label: o.name,
        amount: o.amount,
        etaDaysMin: o.eta_days_min,
        etaDaysMax: o.eta_days_max,
        metadata: {
          quote_id: quoteId,
          service_id: o.service_id,
          volumes,
          packages: o.packages,
          company: o.company,
        },
      }))

      return json(200, {
        status: 'ok',
        providerId: 'melhorenvio',
        mode: 'live',
        options,
        quotedAt,
        expiresAt,
        requestFingerprint: fp,
        disclaimer:
          'Cotação Melhor Envio sandbox. Não é frete de produção até D-FRETE C.',
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
          quotedAt,
        })
      }
      return json(501, {
        status: 'not_configured',
        providerId: 'correios',
        mode: 'live',
        options: [],
        message:
          'Integração HTTP Correios ainda não habilitada (esqueleto quote-shipping pronto).',
        quotedAt,
      })
    }

    if (provider === 'carrier' || provider === 'frenet') {
      return json(501, {
        status: 'not_configured',
        providerId: provider,
        mode: 'stub',
        options: [],
        message: `Provedor ${provider} reservado — MARCHA própria futura.`,
        quotedAt,
      })
    }

    return json(400, { error: 'unknown_provider', provider })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'quote_shipping_error'
    return json(500, { error: 'internal', message })
  }
})
