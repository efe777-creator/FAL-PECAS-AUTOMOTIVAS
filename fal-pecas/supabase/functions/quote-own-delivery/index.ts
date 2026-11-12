/**
 * FAL — quote-own-delivery (frete próprio v2)
 * Pipeline: cobertura → POL → veículo → Routes ida → tarifa categoria → shipping_quotes (ownq:)
 * Secret: GOOGLE_MAPS_API_KEY (nunca VITE_). Sem key → routing_error honesto.
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

function onlyDigits(v: string): string {
  return (v || '').replace(/\D/g, '')
}

/** frete = max(km_ida * R$/km, tarifa_minima) + adicional */
function computeAmount(km: number, perKm: number, min: number, adicional = 0): number {
  const extra = Number.isFinite(adicional) && adicional > 0 ? adicional : 0
  return Math.round((Math.max(km * perKm, min) + extra) * 100) / 100
}

function addressHash(parts: {
  originPostal: string
  destPostal: string
  number: string
  street: string
  city: string
  state: string
}): string {
  return [
    parts.originPostal,
    parts.destPostal,
    parts.number.trim().toLowerCase(),
    parts.street.trim().toLowerCase(),
    parts.city.trim().toLowerCase(),
    parts.state.trim().toUpperCase(),
  ].join('|')
}

type Item = { productId: string; quantity: number }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!supabaseUrl || !anonKey || !serviceKey) return json(500, { error: 'supabase_env_missing' })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json(401, { error: 'unauthorized' })

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    // Guest pode cotar frete próprio no carrinho (JWT anon). customer_id opcional.
    const { data: userData } = await userClient.auth.getUser()
    const user = userData.user

    const admin = createClient(supabaseUrl, serviceKey)
    const body = await req.json()
    const postalCode = onlyDigits(String(body.postalCode ?? ''))
    const number = String(body.number ?? '').trim()
    const street = String(body.street ?? '').trim()
    const district = String(body.district ?? '').trim()
    const city = String(body.city ?? '').trim()
    const state = String(body.state ?? '').trim().toUpperCase().slice(0, 2)
    const items = (Array.isArray(body.items) ? body.items : []) as Item[]

    if (postalCode.length !== 8) return json(400, { status: 'out_of_coverage', message: 'CEP inválido' })
    if (!number) {
      return json(200, {
        status: 'missing_number',
        message: 'Informe o número do imóvel para cotar a entrega FAL.',
        options: [],
      })
    }
    if (!items.length) return json(400, { error: 'items_required' })

    const { data: settings } = await admin.from('store_own_delivery_settings').select('*').limit(1).maybeSingle()
    if (!settings?.enabled) {
      return json(200, { status: 'disabled', message: 'Frete próprio desativado', options: [] })
    }
    if (settings.pricing_mode !== 'distance_vehicle') {
      return json(200, {
        status: 'flat_mode',
        message: 'Modo flat ativo — use cotação client own:*',
        options: [],
      })
    }

    const { data: inCov } = await admin.rpc('own_delivery_cep_in_coverage', { p_postal_code: postalCode })
    if (!inCov) {
      return json(200, { status: 'out_of_coverage', message: 'CEP fora da cobertura', options: [] })
    }

    const maxKmGlobal = settings.max_distance_km != null ? Number(settings.max_distance_km) : null

    const productIds = items.map((i) => i.productId)
    const { data: products, error: prodErr } = await admin
      .from('products')
      .select(
        'id, pol_unit, own_delivery_allowed, vehicle_min_code, compatible_vehicle_codes, logistic_restrictions',
      )
      .in('id', productIds)
    if (prodErr) return json(500, { error: prodErr.message })

    const byId = new Map((products ?? []).map((p) => [p.id, p]))
    let polTotal = 0
    const profiles: Array<{
      productId: string
      polUnit: number
      vehicleMinCode: string | null
      compatibleVehicleCodes: string[]
      ownDeliveryAllowed: boolean
    }> = []

    for (const item of items) {
      const p = byId.get(item.productId)
      if (!p) {
        return json(200, {
          status: 'incomplete',
          message: 'Produto sem perfil logístico',
          options: [],
        })
      }
      if (p.own_delivery_allowed === false) {
        return json(200, {
          status: 'ineligible',
          message: 'Há produto não elegível ao frete próprio',
          options: [],
        })
      }
      if (p.pol_unit == null) {
        return json(200, {
          status: 'incomplete',
          message: 'Há produto sem POL cadastrado',
          options: [],
        })
      }
      const qty = Math.max(1, Number(item.quantity) || 1)
      polTotal += qty * Number(p.pol_unit)
      profiles.push({
        productId: p.id,
        polUnit: Number(p.pol_unit),
        vehicleMinCode: p.vehicle_min_code,
        compatibleVehicleCodes: p.compatible_vehicle_codes ?? [],
        ownDeliveryAllowed: true,
      })
    }

    const { data: categories } = await admin
      .from('own_vehicle_categories')
      .select('*')
      .eq('active', true)
      .order('sort_order')
    const { data: tariffs } = await admin.from('own_vehicle_tariffs').select('*').eq('active', true)

    const order = (categories ?? []).map((c) => c.code as string)
    let requiredMin: string | null = null
    for (const p of profiles) {
      if (!p.vehicleMinCode) continue
      if (!requiredMin) requiredMin = p.vehicleMinCode
      else if (order.indexOf(p.vehicleMinCode) > order.indexOf(requiredMin)) {
        requiredMin = p.vehicleMinCode
      }
    }

    let candidates = (categories ?? []).filter((c) =>
      (tariffs ?? []).some((t) => t.category_id === c.id && t.active),
    )
    candidates = candidates.filter((c) => Number(c.capacity_pol) >= polTotal)
    candidates = candidates.filter((c) => {
      if (!requiredMin) return true
      const ci = order.indexOf(c.code)
      const ri = order.indexOf(requiredMin)
      if (ci < 0 || ri < 0) return c.code === requiredMin
      return ci >= ri
    })
    candidates = candidates.filter((c) =>
      profiles.every(
        (p) => !p.compatibleVehicleCodes.length || p.compatibleVehicleCodes.includes(c.code),
      ),
    )
    if (polTotal > 12) candidates = candidates.filter((c) => c.code !== 'motorcycle')
    candidates.sort((a, b) => a.sort_order - b.sort_order)

    const chosen = candidates[0]
    if (!chosen) {
      return json(200, {
        status: 'manual_review',
        message: 'Entrega FAL sob análise — carga especial.',
        polTotal,
        options: [],
      })
    }
    const tariff = (tariffs ?? []).find((t) => t.category_id === chosen.id && t.active)
    if (!tariff) {
      return json(200, { status: 'manual_review', message: 'Tarifa indisponível', options: [] })
    }

    const { data: origin } = await admin.from('store_shipping_origin').select('*').limit(1).maybeSingle()
    if (!origin) return json(500, { error: 'origin_missing' })

    const originPostal = onlyDigits(origin.postal_code)
    const hash = addressHash({
      originPostal,
      destPostal: postalCode,
      number,
      street,
      city,
      state,
    })

    let distanceKm: number | null = null
    const { data: cached } = await admin
      .from('own_route_distance_cache')
      .select('distance_km, expires_at')
      .eq('address_hash', hash)
      .maybeSingle()
    if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
      distanceKm = Number(cached.distance_km)
    } else {
      if (!googleKey) {
        return json(200, {
          status: 'routing_error',
          message: 'Roteamento indisponível (configuração).',
          options: [],
        })
      }

      const originAddr = [
        origin.street,
        origin.number,
        origin.district,
        origin.city,
        origin.state,
        originPostal,
        'Brasil',
      ]
        .filter(Boolean)
        .join(', ')
      const destAddr = [street, number, district, city, state, postalCode, 'Brasil']
        .filter(Boolean)
        .join(', ')

      const routeRes = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleKey,
            'X-Goog-FieldMask': 'routes.distanceMeters',
          },
          body: JSON.stringify({
            origin: { address: originAddr },
            destination: { address: destAddr },
            travelMode: 'DRIVE',
            languageCode: 'pt-BR',
            regionCode: 'BR',
          }),
        },
      )
      if (!routeRes.ok) {
        let googleReason = `http_${routeRes.status}`
        try {
          const errJson = await routeRes.json()
          const msg = errJson?.error?.message || errJson?.error?.status
          if (typeof msg === 'string' && msg.trim()) {
            googleReason = msg.trim().slice(0, 160)
          }
        } catch {
          /* ignore parse */
        }
        return json(200, {
          status: 'routing_error',
          message: 'Não foi possível calcular a rota.',
          detail: googleReason,
          options: [],
        })
      }
      const routeJson = await routeRes.json()
      const meters = routeJson?.routes?.[0]?.distanceMeters
      if (meters == null) {
        return json(200, {
          status: 'routing_error',
          message: 'Rota não encontrada para o endereço.',
          options: [],
        })
      }
      distanceKm = Math.round((Number(meters) / 1000) * 1000) / 1000
      const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
      await admin.from('own_route_distance_cache').upsert(
        {
          address_hash: hash,
          origin_postal_code: originPostal,
          dest_postal_code: postalCode,
          dest_number: number,
          distance_km: distanceKm,
          provider: 'google_routes',
          expires_at: expires,
        },
        { onConflict: 'address_hash' },
      )
    }

    if (distanceKm == null) {
      return json(200, { status: 'routing_error', message: 'Distância indisponível', options: [] })
    }

    const maxKmVehicle =
      chosen.max_distance_km != null && Number.isFinite(Number(chosen.max_distance_km))
        ? Number(chosen.max_distance_km)
        : null
    const maxKmEffective = maxKmVehicle ?? maxKmGlobal
    if (maxKmEffective != null && distanceKm > maxKmEffective) {
      return json(200, {
        status: 'out_of_coverage',
        message: 'Distância acima do limite atendido pela modalidade',
        distanceKm,
        maxKm: maxKmEffective,
        options: [],
      })
    }

    const adicional = Number(tariff.adicional ?? 0)
    const amount = computeAmount(
      distanceKm,
      Number(tariff.valor_por_km),
      Number(tariff.tarifa_minima),
      adicional,
    )
    const baseEtaMin = Number(settings.eta_days_min) || 1
    const baseEtaMax = Math.max(baseEtaMin, Number(settings.eta_days_max) || 3)
    const { data: etaPolicyRow } = await admin
      .from('store_shipping_eta_policy')
      .select('own_extra_days, own_day_count_mode')
      .limit(1)
      .maybeSingle()
    const ownExtra = Math.max(0, Number(etaPolicyRow?.own_extra_days ?? 0) || 0)
    const etaMin = baseEtaMin + ownExtra
    const etaMax = baseEtaMax + ownExtra

    const { data: customer } = user?.id
      ? await admin.from('customers').select('id').eq('profile_id', user.id).maybeSingle()
      : { data: null }

    const option = {
      vehicle_code: chosen.code,
      label: `Entrega FAL (${chosen.label})`,
      amount,
      eta_days_min: etaMin,
      eta_days_max: etaMax,
      base_eta_min: baseEtaMin,
      base_eta_max: baseEtaMax,
      extra_days: ownExtra,
      day_count_mode: String(etaPolicyRow?.own_day_count_mode ?? 'business_days'),
      pol_total: polTotal,
      distance_km_one_way: distanceKm,
      tariff_min: Number(tariff.tarifa_minima),
      tariff_per_km: Number(tariff.valor_por_km),
      tariff_adicional: adicional,
      tariff_version: tariff.version,
      category_id: chosen.id,
      vehicle_icon: chosen.icon ?? null,
      vehicle_max_km: maxKmEffective,
    }

    const fingerprint = [
      originPostal,
      postalCode,
      number,
      items.map((i) => `${i.productId}:${i.quantity}`).sort().join('|'),
      chosen.code,
      String(tariff.version),
      String(distanceKm),
    ].join('::')

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const { data: quote, error: qErr } = await admin
      .from('shipping_quotes')
      .insert({
        customer_id: customer?.id ?? null,
        provider: 'own',
        request_fingerprint: fingerprint,
        postal_code: postalCode,
        origin_postal_code: originPostal,
        options: [option],
        volumes: { pol_total: polTotal, vehicle: chosen.code },
        expires_at: expiresAt,
      })
      .select('id')
      .single()
    if (qErr || !quote) return json(500, { error: qErr?.message ?? 'quote_persist_failed' })

    const optionId = `ownq:${quote.id}:${chosen.code}`
    return json(200, {
      status: 'priced',
      polTotal,
      distanceKm,
      vehicleCode: chosen.code,
      options: [
        {
          id: optionId,
          provider: 'own',
          serviceCode: chosen.code,
          label: option.label,
          amount,
          etaDaysMin: etaMin,
          etaDaysMax: etaMax,
          metadata: {
            kind: 'own_distance_vehicle',
            polTotal,
            distanceKmOneWay: distanceKm,
            vehicleCode: chosen.code,
            quoteId: quote.id,
          },
        },
      ],
      expiresAt,
    })
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : 'own_quote_failed' })
  }
})
