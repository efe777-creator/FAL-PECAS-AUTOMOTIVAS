/**
 * FAL — melhorenvio-reverse
 *
 * Logística reversa ME (PAC/SEDEX). Separada da ida (melhorenvio-label).
 * Cliente ou staff autenticado; FAL paga (conta ME).
 * Actions: status | generate
 * Secrets: MELHOR_ENVIO_TOKEN, MELHOR_ENVIO_USER_AGENT, MELHOR_ENVIO_API_BASE.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { meApiBase, meAuthHeaders, meRuntimeMode } from '../_shared/melhorEnvioCore.ts'

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

function digits(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '')
}

function volumeFromMeta(meta: Record<string, unknown>): {
  width: number
  height: number
  length: number
  weight: number
  count: number
} {
  const packing = meta.packing as { volumes?: Record<string, unknown>[] } | undefined
  const packingVols = Array.isArray(packing?.volumes) ? packing!.volumes! : []
  if (packingVols.length > 0) {
    const first = packingVols[0]!
    return {
      width: Number(first.widthCm ?? first.width ?? 11),
      height: Number(first.heightCm ?? first.height ?? 2),
      length: Number(first.lengthCm ?? first.length ?? 16),
      weight: Number(first.weightKg ?? first.weight ?? 0.3),
      count: packingVols.length,
    }
  }
  const me = (meta.me ?? {}) as Record<string, unknown>
  const vol = (me.volumes ?? {}) as Record<string, unknown>
  const packages = Array.isArray(vol.packages) ? vol.packages : null
  return {
    width: Number(vol.widthCm ?? vol.width ?? 11),
    height: Number(vol.heightCm ?? vol.height ?? 2),
    length: Number(vol.lengthCm ?? vol.length ?? 16),
    weight: Number(vol.weightKg ?? vol.weight ?? 0.3),
    count: packages && packages.length > 0 ? packages.length : me.cart_item_id ? 1 : 0,
  }
}

function pickCheapestPacSedex(
  rows: unknown[],
  override: 'pac' | 'sedex' | null,
): { serviceId: number; price: number; name: string } | null {
  const wanted = override === 'sedex' ? 2 : override === 'pac' ? 1 : null
  const mapped = rows
    .filter((r) => r && typeof r === 'object')
    .map((r) => {
      const row = r as Record<string, unknown>
      return {
        serviceId: Number(row.id ?? 0),
        price: Number(row.price ?? 0),
        name: String(row.name ?? row.service ?? ''),
      }
    })
    .filter((o) => o.serviceId === 1 || o.serviceId === 2)
  if (wanted) {
    const hit = mapped.find((m) => m.serviceId === wanted)
    if (hit) return hit
  }
  if (mapped.length === 0) return null
  return mapped.reduce((a, b) => (b.price < a.price ? b : a))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const meToken = (Deno.env.get('MELHOR_ENVIO_TOKEN') ?? '').trim().replace(/^Bearer\s+/i, '')
    const meUa = (
      Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'FAL Pecas Automotivas (efe.comercioltda@gmail.com)'
    ).trim()
    if (!supabaseUrl || !anonKey || !serviceKey) return json(500, { error: 'supabase_env_missing' })

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

    const action = String(body.action ?? 'generate')
    const orderId = String(body.orderId ?? '')
    const occurrenceId = String(body.occurrenceId ?? '')
    if (!orderId || !occurrenceId) {
      return json(400, { error: 'order_id_and_occurrence_required' })
    }
    if (action !== 'generate' && action !== 'status') {
      return json(400, { error: 'invalid_action' })
    }

    const { data: isStaff } = await userClient.rpc('is_staff')
    const staff = isStaff === true

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('id, status, shipping_amount, address_snapshot, customer_id, total')
      .eq('id', orderId)
      .maybeSingle()
    if (orderErr || !order) return json(404, { error: 'order_not_found' })

    const { data: cust } = await admin
      .from('customers')
      .select('id, profile_id')
      .eq('id', order.customer_id)
      .maybeSingle()
    if (!staff) {
      if (!cust || cust.profile_id !== user.id) return json(403, { error: 'not_order_owner' })
    }

    let profilePhone = ''
    let profileEmail = ''
    let profileName = ''
    if (cust?.profile_id) {
      const { data: prof } = await admin
        .from('profiles')
        .select('phone, full_name')
        .eq('id', cust.profile_id)
        .maybeSingle()
      profilePhone = String(prof?.phone ?? '')
      profileName = String(prof?.full_name ?? '')
      const { data: authUser } = await admin.auth.admin.getUserById(String(cust.profile_id))
      profileEmail = String(authUser?.user?.email ?? '')
    }

    const { data: events } = await admin
      .from('order_events')
      .select('event_type, payload, created_at')
      .eq('order_id', orderId)
      .in('event_type', [
        'occurrence_opened',
        'occurrence_updated',
        'occurrence_assigned',
        'occurrence_started',
        'occurrence_resolved',
        'occurrence_reopened',
      ])
      .order('created_at', { ascending: false })
      .limit(80)

    const occEvents = (events ?? []).filter(
      (e) => String((e.payload as Record<string, unknown>)?.occurrence_id ?? '') === occurrenceId,
    )
    const last = occEvents[0]
    if (!last) return json(404, { error: 'occurrence_not_found' })
    const lastPayload = (last.payload ?? {}) as Record<string, unknown>
    const stage = String(lastPayload.stage ?? '')
    const returnMode = String(lastPayload.return_mode ?? '')
    const meReverseExisting =
      lastPayload.me_reverse && typeof lastPayload.me_reverse === 'object'
        ? (lastPayload.me_reverse as Record<string, unknown>)
        : null
    const existingCode = String(meReverseExisting?.tracking_code ?? '').trim()
    const expiresAt = meReverseExisting?.expires_at
      ? Date.parse(String(meReverseExisting.expires_at))
      : NaN
    const codeValid = Boolean(existingCode) && (Number.isNaN(expiresAt) || expiresAt > Date.now())

    const { data: shipRows } = await admin
      .from('shipments')
      .select('id, provider, status, amount, tracking_code, metadata')
      .eq('order_id', orderId)
      .limit(1)
    const shipment = Array.isArray(shipRows) ? shipRows[0] : null
    const meta = (shipment?.metadata ?? {}) as Record<string, unknown>
    const me = (meta.me ?? {}) as Record<string, unknown>
    const meOrderId = String(me.cart_item_id ?? me.cart_id ?? '').trim()
    const vol = volumeFromMeta(meta)
    const provider = String(shipment?.provider ?? '')
    const meMode = meRuntimeMode()
    const sandbox = meMode === 'sandbox'
    /** Staff smoke/VAL: gera código DRY sem chamar ME (cart_item_id sintético). */
    const forceDryRun = staff && body.forceDryRun === true
    const dryRun = !meToken || forceDryRun

    const eligible =
      order.status === 'entregue' &&
      provider.toLowerCase().includes('melhorenvio') &&
      vol.count === 1 &&
      Boolean(meOrderId)

    if (action === 'status') {
      return json(200, {
        ok: true,
        orderId,
        occurrenceId,
        stage,
        returnMode,
        eligible,
        codeValid,
        meReverse: meReverseExisting,
        sandbox,
        dryRun,
        selectedServiceHint: lastPayload.service_override ?? null,
      })
    }

    if (last.event_type === 'occurrence_resolved') {
      return json(409, { ok: false, error: 'occurrence_resolved', message: 'Caso já resolvido.' })
    }
    if (stage !== 'autorizada' || returnMode !== 'me_codigo') {
      return json(409, {
        ok: false,
        error: 'not_authorized_me',
        message: 'Caso precisa estar autorizado com return_mode me_codigo.',
      })
    }
    if (codeValid) {
      return json(200, {
        ok: true,
        orderId,
        occurrenceId,
        trackingCode: existingCode,
        trackingUrl: meReverseExisting?.tracking_url ?? null,
        expiresAt: meReverseExisting?.expires_at ?? null,
        message: 'Código já gerado — idempotente.',
        sandbox,
        dryRun,
      })
    }
    if (!eligible) {
      return json(409, {
        ok: false,
        error: 'not_eligible',
        message: 'Pedido não elegível para logística reversa ME (use WA/loja).',
        blockers: {
          status: order.status,
          provider,
          volumeCount: vol.count,
          meOrderId: meOrderId || null,
        },
      })
    }

    const addrSnap = (order.address_snapshot ?? {}) as Record<string, unknown>
    const customerPostal = digits(addrSnap.postal_code ?? addrSnap.cep ?? addrSnap.zip).slice(0, 8)
    const { data: originRow } = await admin
      .from('store_shipping_origin')
      .select('postal_code, phone, sender_name')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    const storePostal = digits(originRow?.postal_code).slice(0, 8)

    const senderMail =
      String(profileEmail || addrSnap.email || 'cliente@falpecas.local').trim() ||
      'cliente@falpecas.local'
    const senderPhone =
      digits(profilePhone || addrSnap.phone || '11999999999').slice(0, 11) || '11999999999'
    void profileName

    let overrideRaw = String(body.serviceOverride ?? lastPayload.service_override ?? '')
      .toLowerCase()
      .trim()
    const serviceOverride: 'pac' | 'sedex' | null =
      overrideRaw === 'sedex' || overrideRaw === '2'
        ? 'sedex'
        : overrideRaw === 'pac' || overrideRaw === '1'
          ? 'pac'
          : null

    const insurance = Math.max(1, Number(order.shipping_amount ?? order.total ?? 1) || 1)
    let serviceId = serviceOverride === 'sedex' ? 2 : 1
    let amount = 0
    let protocol: string | null = null
    let trackingCode = ''
    let trackingUrl: string | null = null
    let cartId: string | null = null

    if (dryRun) {
      trackingCode = `DRY-REV-${orderId.slice(0, 8).toUpperCase()}`
      protocol = `DRY-REV-P-${occurrenceId.slice(0, 8).toUpperCase()}`
      amount = 12.5
      serviceId = serviceOverride === 'sedex' ? 2 : 1
    } else {
      if (customerPostal.length !== 8 || storePostal.length !== 8) {
        return json(422, {
          ok: false,
          error: 'postal_missing',
          message: 'CEP do cliente ou da loja ausente para cotação reversa.',
        })
      }

      // Cotação: cliente → loja (PAC/SEDEX)
      const calcRes = await fetch(`${meApiBase()}/api/v2/me/shipment/calculate`, {
        method: 'POST',
        headers: meAuthHeaders(meToken, meUa),
        body: JSON.stringify({
          from: { postal_code: customerPostal },
          to: { postal_code: storePostal },
          products: [
            {
              id: 'rev',
              width: vol.width,
              height: vol.height,
              length: vol.length,
              weight: vol.weight,
              insurance_value: insurance,
              quantity: 1,
            },
          ],
        }),
      })
      const calcData = await calcRes.json().catch(() => null)
      if (!calcRes.ok) {
        return json(502, {
          ok: false,
          error: 'me_quote_failed',
          message: 'Falha na cotação PAC/SEDEX para devolução.',
          sandbox,
        })
      }
      const picked = pickCheapestPacSedex(Array.isArray(calcData) ? calcData : [], serviceOverride)
      if (!picked) {
        return json(422, {
          ok: false,
          error: 'pac_sedex_unavailable',
          message: 'PAC/SEDEX indisponíveis para o trecho.',
          sandbox,
        })
      }
      serviceId = picked.serviceId
      amount = picked.price

      const reverseBody = {
        service: serviceId,
        new_sender_mail: senderMail,
        new_sender_phone: senderPhone,
        insurance_value: insurance,
        order_id: meOrderId,
        package: {
          weight: vol.weight,
          height: vol.height,
          width: vol.width,
          length: vol.length,
        },
        options: {
          own_hand: false,
          receipt: false,
          dce: { key: '' },
        },
      }

      const cartRes = await fetch(`${meApiBase()}/api/v2/me/cart/reverse`, {
        method: 'POST',
        headers: meAuthHeaders(meToken, meUa),
        body: JSON.stringify(reverseBody),
      })
      const cartJson = (await cartRes.json().catch(() => null)) as Record<string, unknown> | null
      if (!cartRes.ok || !cartJson?.id) {
        return json(502, {
          ok: false,
          error: 'me_reverse_cart_failed',
          message: 'Falha ao inserir logística reversa no carrinho Melhor Envio.',
          detail: JSON.stringify(cartJson).slice(0, 240),
          sandbox,
        })
      }
      cartId = String(cartJson.id)

      const coRes = await fetch(`${meApiBase()}/api/v2/me/shipment/checkout`, {
        method: 'POST',
        headers: meAuthHeaders(meToken, meUa),
        body: JSON.stringify({ orders: [cartId] }),
      })
      const coJson = (await coRes.json().catch(() => null)) as Record<string, unknown> | null
      if (!coRes.ok) {
        return json(502, {
          ok: false,
          error: 'me_reverse_checkout_failed',
          message: 'Falha no checkout da devolução (saldo ME?).',
          detail: JSON.stringify(coJson).slice(0, 240),
          sandbox,
        })
      }
      const purchase = (coJson?.purchase ?? coJson) as Record<string, unknown> | undefined
      protocol = String(purchase?.protocol ?? cartId)

      const genRes = await fetch(`${meApiBase()}/api/v2/me/shipment/generate`, {
        method: 'POST',
        headers: meAuthHeaders(meToken, meUa),
        body: JSON.stringify({ orders: [cartId] }),
      })
      if (!genRes.ok) {
        // Sandbox não gera código — fallback auditável se sandbox
        if (sandbox) {
          trackingCode = `SBX-REV-${cartId.slice(0, 8).toUpperCase()}`
        } else {
          const errBody = await genRes.text().catch(() => '')
          return json(502, {
            ok: false,
            error: 'me_reverse_generate_failed',
            message:
              'Compra ok, mas falhou gerar código de devolução. Confira no painel Melhor Envio.',
            detail: errBody.slice(0, 200),
            protocol,
            cartId,
            sandbox,
          })
        }
      }

      if (!trackingCode) {
        const trackRes = await fetch(`${meApiBase()}/api/v2/me/shipment/tracking`, {
          method: 'POST',
          headers: meAuthHeaders(meToken, meUa),
          body: JSON.stringify({ orders: [cartId] }),
        })
        const trackData = await trackRes.json().catch(() => null)
        const row = Array.isArray(trackData)
          ? trackData[0]
          : trackData && typeof trackData === 'object'
            ? (trackData as Record<string, unknown>)[cartId] ?? trackData
            : null
        if (row && typeof row === 'object') {
          const o = row as Record<string, unknown>
          trackingCode = String(o.tracking ?? o.tracking_code ?? o.code ?? '').trim()
          trackingUrl = String(o.tracking_url ?? o.self_tracking ?? o.url ?? '').trim() || null
        }
        if (!trackingCode) {
          trackingCode = protocol || cartId
        }
      }
    }

    const expiresIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: attachData, error: attachErr } = await userClient.rpc('attach_me_return_code', {
      p_order_id: orderId,
      p_occurrence_id: occurrenceId,
      p_tracking_code: trackingCode,
      p_tracking_url: trackingUrl,
      p_protocol: protocol,
      p_expires_at: expiresIso,
      p_service_id: serviceId,
      p_amount: amount,
    })
    if (attachErr) {
      return json(500, {
        ok: false,
        error: 'attach_failed',
        message: attachErr.message,
        trackingCode,
        protocol,
      })
    }

    if (shipment?.id) {
      const nextMeta = {
        ...meta,
        me_reverse: {
          ...(typeof meta.me_reverse === 'object' && meta.me_reverse
            ? (meta.me_reverse as Record<string, unknown>)
            : {}),
          occurrence_id: occurrenceId,
          cart_item_id: cartId,
          protocol,
          tracking_code: trackingCode,
          tracking_url: trackingUrl,
          service_id: serviceId,
          amount,
          expires_at: expiresIso,
          generated_at: new Date().toISOString(),
          generated_by: user.id,
          dry_run: dryRun,
          sandbox,
        },
      }
      await admin
        .from('shipments')
        .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
        .eq('id', shipment.id)
    }

    return json(200, {
      ok: true,
      orderId,
      occurrenceId,
      trackingCode,
      trackingUrl,
      protocol,
      expiresAt: expiresIso,
      serviceId,
      amount,
      sandbox,
      dryRun,
      attach: attachData,
      message: forceDryRun
        ? 'Código dry-run gerado (forceDryRun staff/smoke).'
        : dryRun
          ? 'Código dry-run gerado (sem token ME).'
          : sandbox
            ? 'Código gerado (sandbox — validação limitada).'
            : 'Código de devolução Melhor Envio gerado. Leve à agência dos Correios.',
    })
  } catch (e) {
    return json(500, {
      error: 'internal',
      message: e instanceof Error ? e.message : 'unknown',
    })
  }
})
