/**
 * FAL — melhorenvio-webhook (tracking-only)
 *
 * Valida HMAC-SHA256 (X-ME-Signature), registra evento.
 * Se houver código/URL de rastreio → apply_me_tracking_update (notifica cliente).
 * NÃO chama ship_order nem deliver_order.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { verifyMeWebhookSignature } from '../_shared/melhorEnvioCore.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-me-signature',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function dig(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const secret = Deno.env.get('MELHOR_ENVIO_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'supabase_env_missing' })

  const rawBody = await req.text()
  const signature = req.headers.get('x-me-signature')

  if (!secret) {
    return json(503, {
      error: 'webhook_secret_missing',
      message: 'Configure MELHOR_ENVIO_WEBHOOK_SECRET.',
    })
  }

  const valid = await verifyMeWebhookSignature(rawBody, signature, secret)
  if (!valid) return json(401, { error: 'invalid_signature' })

  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return json(400, { error: 'invalid_json' })
  }

  const eventId = String(payload.id ?? payload.event_id ?? '')
  const eventType = String(payload.event ?? payload.type ?? 'unknown').toLowerCase()
  const data = (payload.data && typeof payload.data === 'object'
    ? payload.data
    : payload) as Record<string, unknown>

  const protocol = String(data.protocol ?? payload.protocol ?? '').trim()
  const trackingCode = String(
    data.tracking ?? data.tracking_code ?? dig(data, 'tags', '0') ?? '',
  ).trim()
  const trackingUrl = String(
    data.tracking_url ?? data.self_tracking ?? data.url ?? '',
  ).trim()
  const orderIdHint = String(
    data.order_id ?? data.orderId ?? dig(data, 'tags', 'order_id') ?? '',
  ).trim()

  const admin = createClient(supabaseUrl, serviceKey)

  try {
    await admin.from('melhorenvio_webhook_events').insert({
      event_id: eventId || `anon-${Date.now()}`,
      event_type: eventType,
      protocol: protocol || null,
      payload_sanitized: {
        event: eventType,
        protocol: protocol || null,
        tracking: trackingCode || null,
        tracking_url: trackingUrl || null,
        received_at: new Date().toISOString(),
      },
    })
  } catch {
    // ledger opcional
  }

  // Espelho de trânsito / entregue: só metadado (sem deliver_order)
  const isTrackingEvent =
    /track|posted|postagem|shipped|received|delivered|order\./i.test(eventType) ||
    Boolean(trackingCode || trackingUrl)

  let applied: Record<string, unknown> | null = null
  if (isTrackingEvent && (trackingCode || trackingUrl || protocol)) {
    let orderId = orderIdHint
    if (!orderId && protocol) {
      const { data: ships2 } = await admin
        .from('shipments')
        .select('order_id, metadata')
        .filter('metadata->me->>protocol', 'eq', protocol)
        .limit(1)
      if (ships2?.[0]?.order_id) orderId = String(ships2[0].order_id)
    }

    if (orderId) {
      // delivered: só espelha tracking_events; status comercial permanece manual
      if (/delivered|entregue/i.test(eventType)) {
        const { data: shipRows } = await admin
          .from('shipments')
          .select('id, metadata')
          .eq('order_id', orderId)
          .limit(1)
        const ship = shipRows?.[0]
        if (ship) {
          const meta = (ship.metadata ?? {}) as Record<string, unknown>
          const me = { ...((meta.me as object) ?? {}), last_webhook_event: eventType }
          const events = Array.isArray((me as { tracking_events?: unknown }).tracking_events)
            ? [...((me as { tracking_events: unknown[] }).tracking_events)]
            : []
          events.push({ at: new Date().toISOString(), event: eventType, source: 'webhook' })
          ;(me as { tracking_events: unknown[] }).tracking_events = events
          await admin
            .from('shipments')
            .update({ metadata: { ...meta, me } })
            .eq('id', ship.id)
        }
      }

      if (trackingCode || trackingUrl) {
        const { data: rpcData, error: rpcErr } = await admin.rpc('apply_me_tracking_update', {
          p_order_id: orderId,
          p_tracking_code: trackingCode || null,
          p_tracking_url: trackingUrl || null,
          p_protocol: protocol || null,
        })
        if (!rpcErr) applied = rpcData as Record<string, unknown>
      }
    }
  }

  return json(200, {
    ok: true,
    stub: false,
    trackingOnly: true,
    message:
      'Evento recebido. Rastreio pode ter sido atualizado; ship_order/deliver_order permanecem manuais.',
    eventType,
    protocol: protocol || null,
    applied,
    duplicateSafe: true,
  })
})
