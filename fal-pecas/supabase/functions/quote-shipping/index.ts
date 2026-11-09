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
import { meApiBase } from '../_shared/melhorEnvioCore.ts'
import {
  resolvePackingStrategy,
  sumItemsWeightKg,
  type PackingBox,
  type PackingItem,
} from '../_shared/shippingPacking.ts'

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
    // Cotação de vitrine/carrinho guest: JWT anon basta. Sessão de usuário é opcional
    // (customer_id na shipping_quotes). Ações staff exigem user + is_staff.
    const {
      data: { user },
    } = await userClient.auth.getUser()

    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return json(400, { error: 'invalid_json' })
    }

    const action = String(body.action ?? '').trim()
    const quotedAtEarly = new Date().toISOString()

    /** Status integração ME (staff) — sem expor secrets. */
    if (action === 'me_admin_status') {
      if (!user) return json(401, { error: 'unauthorized' })
      const { data: staffOk } = await userClient.rpc('is_staff')
      if (!staffOk) return json(403, { error: 'staff_required' })
      if (!serviceKey) return json(500, { error: 'supabase_service_role_missing' })
      const admin = createClient(supabaseUrl, serviceKey)
      const meToken = (Deno.env.get('MELHOR_ENVIO_TOKEN') ?? '').trim()
      const meUa = (Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? '').trim()
      const { data: origin } = await admin
        .from('store_shipping_origin')
        .select('postal_code, city, state, sender_name')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      const { count: enabledCount } = await admin
        .from('me_shipping_services')
        .select('service_id', { count: 'exact', head: true })
        .eq('enabled', true)
      const { count: catalogCount } = await admin
        .from('me_shipping_services')
        .select('service_id', { count: 'exact', head: true })
      const { data: lastQuote } = await admin
        .from('shipping_quotes')
        .select('id, created_at, postal_code')
        .eq('provider', 'melhorenvio')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return json(200, {
        status: 'ok',
        providerId: 'melhorenvio',
        mode: 'sandbox',
        apiBase: meApiBase(),
        tokenConfigured: meToken.length > 0,
        userAgentConfigured: meUa.length > 0,
        originPostalCode: origin?.postal_code ?? null,
        originCity: origin?.city ?? null,
        originState: origin?.state ?? null,
        senderName: origin?.sender_name ?? null,
        catalogCount: catalogCount ?? 0,
        enabledCount: enabledCount ?? 0,
        lastQuoteAt: lastQuote?.created_at ?? null,
        lastQuotePostal: lastQuote?.postal_code ?? null,
        quotedAt: quotedAtEarly,
        disclaimer:
          'Cotação Melhor Envio sob D-FRETE B (sandbox). Etiqueta só na Expedição.',
      })
    }

    /**
     * Sync catálogo ME (staff): calculate → upsert me_shipping_services
     * (novos entram enabled=false; existentes atualizam nome/logo).
     */
    if (action === 'me_sync_catalog') {
      if (!user) return json(401, { error: 'unauthorized' })
      const { data: staffOk } = await userClient.rpc('is_staff')
      if (!staffOk) return json(403, { error: 'staff_required' })
      const meToken = (Deno.env.get('MELHOR_ENVIO_TOKEN') ?? '')
        .trim()
        .replace(/^Bearer\s+/i, '')
      const meUa = (
        Deno.env.get('MELHOR_ENVIO_USER_AGENT') ??
        'FAL Pecas Automotivas (efe.comercioltda@gmail.com)'
      ).trim()
      if (!meToken) {
        return json(501, {
          error: 'not_configured',
          message: 'MELHOR_ENVIO_TOKEN ausente no Edge.',
        })
      }
      if (!serviceKey) return json(500, { error: 'supabase_service_role_missing' })
      const admin = createClient(supabaseUrl, serviceKey)
      const { data: origin } = await admin
        .from('store_shipping_origin')
        .select('postal_code')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      const originPostal = String(origin?.postal_code ?? '')
        .replace(/\D/g, '')
        .slice(0, 8)
      const toPostal =
        String(body.postalCode ?? '01310100').replace(/\D/g, '').slice(0, 8) || '01310100'
      if (originPostal.length !== 8) {
        return json(422, {
          error: 'not_configured',
          message: 'CEP de origem ausente (store_shipping_origin).',
        })
      }
      const meRes = await fetch(`${meApiBase()}/api/v2/me/shipment/calculate`, {
        method: 'POST',
        headers: meHeaders(meToken, meUa),
        body: JSON.stringify({
          from: { postal_code: originPostal },
          to: { postal_code: toPostal },
          products: [
            {
              id: 'sync',
              width: 11,
              height: 2,
              length: 16,
              weight: 0.3,
              insurance_value: 50,
              quantity: 1,
            },
          ],
        }),
      })
      const meData = await meRes.json().catch(() => null)
      if (!meRes.ok) {
        return json(502, {
          error: 'provider_error',
          message: `ME calculate HTTP ${meRes.status}`,
          detail: meData,
        })
      }
      const rawList = Array.isArray(meData) ? meData : []
      const optionsPayload = rawList
        .filter((row) => row && typeof row === 'object' && !(row as { error?: unknown }).error)
        .map((s) => {
          const row = s as Record<string, unknown>
          const company = (row.company ?? null) as Record<string, unknown> | null
          return {
            service_id: Number(row.id),
            name: String(row.name ?? `Serviço ${row.id}`),
            company: company
              ? {
                  id: company.id ?? null,
                  name: company.name ?? '',
                  picture: company.picture ?? null,
                }
              : null,
          }
        })
        .filter((o) => Number.isFinite(o.service_id) && o.service_id > 0)

      // Preserva enabled/display_name; atualiza nome/logo da ME
      let upserted = 0
      for (const o of optionsPayload) {
        const { data: existing } = await admin
          .from('me_shipping_services')
          .select('service_id, enabled, display_name, sort_hint')
          .eq('service_id', o.service_id)
          .maybeSingle()
        const company = o.company
        const payload = {
          service_id: o.service_id,
          service_name: o.name,
          company_id: company?.id != null ? Number(company.id) : null,
          company_name: String(company?.name ?? ''),
          company_picture: company?.picture ? String(company.picture) : null,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          enabled: existing?.enabled ?? false,
          display_name: existing?.display_name ?? null,
          sort_hint: existing?.sort_hint ?? 100,
        }
        const { error: upErr } = await admin.from('me_shipping_services').upsert(payload, {
          onConflict: 'service_id',
        })
        if (!upErr) upserted += 1
      }

      return json(200, {
        status: 'ok',
        upserted,
        services: optionsPayload.length,
        quotedAt: quotedAtEarly,
      })
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
      const meToken = (Deno.env.get('MELHOR_ENVIO_TOKEN') ?? '')
        .trim()
        .replace(/^Bearer\s+/i, '')
      const meUa = (Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'FAL Pecas Automotivas (efe.comercioltda@gmail.com)').trim()
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

      let maxH = 0
      let maxW = 0
      let maxL = 0
      const packingItems: PackingItem[] = items.map((it) => {
        const qty = Math.max(1, Number(it.quantity ?? 1))
        const w = Number(it.weightKg)
        const h = Number(it.heightCm)
        const wi = Number(it.widthCm)
        const le = Number(it.lengthCm)
        maxH = Math.max(maxH, h)
        maxW = Math.max(maxW, wi)
        maxL = Math.max(maxL, le)
        return { lengthCm: le, widthCm: wi, heightCm: h, weightKg: w, qty }
      })
      const weightSum = sumItemsWeightKg(packingItems)

      // O1-C: menor caixa ativa; sem templates → por item; com templates e nenhuma cabe → erro
      const { data: boxRows } = await admin
        .from('shipping_box_templates')
        .select(
          'id, name, length_cm, width_cm, height_cm, empty_weight_kg, max_weight_kg, active',
        )
        .eq('active', true)
        .order('sort_order', { ascending: true })
      const packBoxes: PackingBox[] = (boxRows ?? []).map((r) => ({
        id: String(r.id),
        name: String(r.name),
        lengthCm: Number(r.length_cm),
        widthCm: Number(r.width_cm),
        heightCm: Number(r.height_cm),
        emptyWeightKg: Number(r.empty_weight_kg ?? 0),
        maxWeightKg: r.max_weight_kg == null ? null : Number(r.max_weight_kg),
        active: Boolean(r.active),
      }))
      const packing = resolvePackingStrategy(packBoxes, packingItems)

      if (packing.mode === 'packing_failed') {
        return json(422, {
          status: 'packing_failed',
          providerId: 'melhorenvio',
          mode: 'live',
          options: [],
          message:
            'Nenhuma caixa cadastrada comporta o volume/peso deste pedido. Ajuste modelos em Logística → Caixas ou as medidas dos produtos.',
          quotedAt,
        })
      }

      let productsFinal: Array<{
        id: string
        width: number
        height: number
        length: number
        weight: number
        insurance_value: number
        quantity: number
      }>
      const packingMode = packing.mode
      const fitted = packing.mode === 'box_template' ? packing.box : null

      if (fitted) {
        const packedWeight = Number(
          (weightSum + fitted.emptyWeightKg).toFixed(3),
        )
        productsFinal = [
          {
            id: `box:${fitted.id}`,
            width: fitted.widthCm,
            height: fitted.heightCm,
            length: fitted.lengthCm,
            weight: packedWeight,
            insurance_value: Number(Math.max(1, subtotal || 1).toFixed(2)),
            quantity: 1,
          },
        ]
      } else {
        productsFinal = items.map((it, idx) => {
          const qty = Math.max(1, Number(it.quantity ?? 1))
          const w = Number(it.weightKg)
          const h = Number(it.heightCm)
          const wi = Number(it.widthCm)
          const le = Number(it.lengthCm)
          const share =
            weightSum > 0 ? (subtotal * (w * qty)) / weightSum : subtotal / items.length
          return {
            id: String(it.productId ?? idx + 1),
            width: wi,
            height: h,
            length: le,
            weight: w,
            insurance_value: Number(Math.max(1, share).toFixed(2)),
            quantity: qty,
          }
        })
      }

      const meRes = await fetch(`${meApiBase()}/api/v2/me/shipment/calculate`, {
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
        const detail =
          meData && typeof meData === 'object'
            ? String((meData as { message?: string }).message ?? JSON.stringify(meData)).slice(0, 240)
            : ''
        return json(502, {
          status: 'provider_error',
          providerId: 'melhorenvio',
          mode: 'live',
          options: [],
          message: `Melhor Envio calculate HTTP ${meRes.status}${detail ? `: ${detail}` : ''} [base=${meApiBase()}]`,
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

      const { data: cust } = user?.id
        ? await admin.from('customers').select('id').eq('profile_id', user.id).maybeSingle()
        : { data: null }

      const fp = fingerprint({
        postalCode,
        originPostalCode: originPostal,
        subtotal,
        itemCount,
        items,
      })
      const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString()
      const volumes = fitted
        ? {
            packingMode,
            boxTemplateId: fitted.id,
            boxName: fitted.name,
            weightKg: Number((weightSum + fitted.emptyWeightKg).toFixed(3)),
            heightCm: fitted.heightCm,
            widthCm: fitted.widthCm,
            lengthCm: fitted.lengthCm,
            itemsWeightKg: weightSum,
            emptyWeightKg: fitted.emptyWeightKg,
          }
        : {
            packingMode: 'per_item' as const,
            weightKg: weightSum,
            heightCm: maxH,
            widthCm: maxW,
            lengthCm: maxL,
            itemLines: items.length,
            note: 'Sem templates ativos — cotação Melhor Envio por item',
          }

      /** Allowlist admin: só `enabled` vai para a loja. */
      const { data: catalogRows } = await admin
        .from('me_shipping_services')
        .select(
          'service_id, enabled, display_name, service_name, company_name, company_picture',
        )
      const catalogById = new Map(
        (catalogRows ?? []).map((r) => [Number(r.service_id), r] as const),
      )
      const hasCatalog = catalogById.size > 0

      const optionsPayload = services
        .map((s) => {
          const serviceId = Number(s.id)
          const price = Number(s.custom_price ?? s.price ?? 0)
          const range = (s.custom_delivery_range ?? s.delivery_range ?? {}) as {
            min?: number
            max?: number
          }
          const company = (s.company ?? null) as Record<string, unknown> | null
          const cfg = catalogById.get(serviceId)
          if (hasCatalog && (!cfg || cfg.enabled !== true)) {
            return null
          }
          const meName = String(s.name ?? cfg?.service_name ?? `Serviço ${serviceId}`)
          const companyName = String(
            company?.name ?? cfg?.company_name ?? '',
          )
          const display =
            (cfg?.display_name && String(cfg.display_name).trim()) ||
            (companyName ? `${companyName} — ${meName}` : meName)
          const picture =
            (company?.picture ? String(company.picture) : null) ||
            (cfg?.company_picture ? String(cfg.company_picture) : null)
          return {
            service_id: serviceId,
            name: display,
            me_name: meName,
            amount: price,
            eta_days_min: Number(range.min ?? s.custom_delivery_time ?? s.delivery_time ?? 0),
            eta_days_max: Number(range.max ?? s.custom_delivery_time ?? s.delivery_time ?? 0),
            packages: s.packages ?? null,
            company: company
              ? {
                  id: company.id ?? null,
                  name: companyName,
                  picture,
                }
              : companyName || picture
                ? { id: null, name: companyName, picture }
                : null,
          }
        })
        .filter((o): o is NonNullable<typeof o> => o != null)
        .sort((a, b) => a.amount - b.amount)

      if (!optionsPayload.length) {
        return json(200, {
          status: 'unavailable',
          providerId: 'melhorenvio',
          mode: 'live',
          options: [],
          message:
            'Nenhuma opção Melhor Envio habilitada para este CEP. Ative serviços em Logística → Melhor Envio.',
          quotedAt,
        })
      }

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
            metadata: {
              ephemeral: true,
              selectable: false,
              volumes,
              warning: 'shipping_quotes_unavailable',
              service_id: o.service_id,
              company: o.company,
              company_name: o.company && typeof o.company === 'object'
                ? (o.company as { name?: string }).name
                : null,
              company_picture: o.company && typeof o.company === 'object'
                ? (o.company as { picture?: string | null }).picture
                : null,
            },
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
          company_name: o.company && typeof o.company === 'object'
            ? (o.company as { name?: string }).name
            : null,
          company_picture: o.company && typeof o.company === 'object'
            ? (o.company as { picture?: string | null }).picture
            : null,
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
