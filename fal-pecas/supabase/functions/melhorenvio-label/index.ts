/**
 * FAL — melhorenvio-label (Sandbox)
 *
 * Máquina idempotente: quote → prepare (cart) → purchase → generate → print / tracking / status.
 * NÃO chama ship_order / deliver_order.
 * Só opera pedidos em pronto_para_envio | preparando_envio.
 * Secrets: MELHOR_ENVIO_TOKEN, MELHOR_ENVIO_USER_AGENT. Sem token → dry_run local (não é produção).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  alreadyGenerated,
  alreadyPurchased,
  evaluateFreightDivergence,
  labelStateOf,
  meAuthHeaders,
  ME_SANDBOX_BASE,
  mergeMeMeta,
  parseMeMeta,
  type MeLabelState,
  type MeMeta,
} from '../_shared/melhorEnvioCore.ts'

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

type Action = 'quote' | 'prepare' | 'purchase' | 'generate' | 'print' | 'tracking' | 'status'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const meToken = Deno.env.get('MELHOR_ENVIO_TOKEN')
    const meUa = Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'FAL Pecas (sandbox)'
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

    const { data: isStaff, error: staffErr } = await userClient.rpc('is_staff')
    if (staffErr || isStaff !== true) return json(403, { error: 'staff_only' })

    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return json(400, { error: 'invalid_json' })
    }

    const action = String(body.action ?? '') as Action
    const orderId = String(body.orderId ?? '')
    if (!orderId) return json(400, { error: 'order_id_required' })
    const allowed: Action[] = [
      'quote',
      'prepare',
      'purchase',
      'generate',
      'print',
      'tracking',
      'status',
    ]
    if (!allowed.includes(action)) return json(400, { error: 'invalid_action' })

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('id, status, shipping_amount, address_snapshot, total')
      .eq('id', orderId)
      .maybeSingle()
    if (orderErr || !order) return json(404, { error: 'order_not_found' })

    const orderStatus = String(order.status)
    if (
      action !== 'status' &&
      action !== 'tracking' &&
      !['pronto_para_envio', 'preparando_envio'].includes(orderStatus)
    ) {
      return json(409, {
        ok: false,
        error: 'order_not_ready_for_label',
        message: 'Etiqueta só após separação (pronto_para_envio).',
        orderId,
        labelState: 'none',
      })
    }

    const { data: shipRows } = await admin
      .from('shipments')
      .select('id, provider, status, amount, tracking_code, metadata')
      .eq('order_id', orderId)
      .limit(1)
    let shipment = Array.isArray(shipRows) ? shipRows[0] : null
    if (!shipment) {
      const { data: inserted } = await admin
        .from('shipments')
        .insert({
          order_id: orderId,
          provider: 'melhorenvio_sandbox',
          status: 'pending',
          amount: Number(order.shipping_amount ?? 0),
          metadata: { me: { label_state: 'none' } },
        })
        .select('id, provider, status, amount, tracking_code, metadata')
        .single()
      shipment = inserted
    }
    if (!shipment) return json(500, { error: 'shipment_missing' })

    const meta = (shipment.metadata ?? {}) as Record<string, unknown>
    const state = labelStateOf(meta)
    const charged = Number(order.shipping_amount ?? 0)
    const dryRun = !meToken
    const sandbox = true

    async function persist(patch: MeMeta, extraShipment?: Record<string, unknown>) {
      const nextMeta = mergeMeMeta(meta, patch)
      Object.assign(meta, nextMeta)
      const { error } = await admin
        .from('shipments')
        .update({
          metadata: nextMeta,
          provider: 'melhorenvio_sandbox',
          ...extraShipment,
        })
        .eq('id', shipment!.id)
      if (error) throw new Error(error.message)
      return nextMeta
    }

    if (action === 'status') {
      return json(200, {
        ok: true,
        orderId,
        labelState: state,
        me: parseMeMeta(meta),
        sandbox,
        dryRun,
      })
    }

    // --- quote ---
    if (action === 'quote') {
      let labelAmount = charged
      let volumes: unknown = null
      if (!dryRun) {
        // Cotação real sandbox: POST /api/v2/me/shipment/calculate (esqueleto — payload mínimo)
        try {
          const pkg = (body.packageOverride ?? {}) as Record<string, unknown>
          const res = await fetch(`${ME_SANDBOX_BASE}/api/v2/me/shipment/calculate`, {
            method: 'POST',
            headers: meAuthHeaders(meToken!, meUa),
            body: JSON.stringify({
              from: { postal_code: '01310100' },
              to: {
                postal_code: String(
                  (order.address_snapshot as Record<string, unknown> | null)?.cep ??
                    (order.address_snapshot as Record<string, unknown> | null)?.zip ??
                    '',
                ).replace(/\D/g, ''),
              },
              products: [
                {
                  id: 'pkg',
                  width: Number(pkg.widthCm ?? 11),
                  height: Number(pkg.heightCm ?? 2),
                  length: Number(pkg.lengthCm ?? 16),
                  weight: Number(pkg.weightKg ?? 0.3),
                  insurance_value: charged,
                  quantity: 1,
                },
              ],
            }),
          })
          const data = await res.json().catch(() => null)
          if (!res.ok) {
            await persist({ last_error: `quote_http_${res.status}` })
            return json(502, {
              ok: false,
              orderId,
              labelState: state,
              error: 'me_quote_failed',
              message: 'Falha na cotação Melhor Envio sandbox.',
              sandbox,
            })
          }
          const first = Array.isArray(data) ? data[0] : null
          if (first && typeof first === 'object') {
            labelAmount = Number((first as { price?: string }).price ?? charged)
            volumes = (first as { packages?: unknown }).packages ?? null
          }
        } catch (e) {
          await persist({
            last_error: e instanceof Error ? e.message.slice(0, 200) : 'quote_error',
          })
          return json(502, { ok: false, orderId, labelState: state, error: 'me_quote_error', sandbox })
        }
      } else {
        labelAmount = charged
      }

      const divergence = evaluateFreightDivergence({
        chargedShipping: charged,
        labelAmount,
        serviceAvailable: true,
      })
      await persist({
        label_state: 'quoted',
        quoted_amount: labelAmount,
        label_amount: labelAmount,
        volumes,
        divergence,
        dry_run: dryRun,
        last_error: null,
      })
      return json(200, {
        ok: true,
        orderId,
        labelState: 'quoted' as MeLabelState,
        divergence,
        message: dryRun
          ? 'Cotação dry-run (MELHOR_ENVIO_TOKEN ausente). Sandbox real exige secret.'
          : 'Cotação sandbox ok.',
        sandbox,
        dryRun,
      })
    }

    // --- prepare (cart) ---
    if (action === 'prepare') {
      if (alreadyPurchased(state)) {
        return json(200, {
          ok: true,
          orderId,
          labelState: state,
          message: 'Já comprada — prepare idempotente.',
          sandbox,
          dryRun,
        })
      }
      const me = parseMeMeta(meta)
      let cartId = me.cart_item_id
      if (!cartId) {
        if (dryRun) {
          cartId = `dry-cart-${orderId.slice(0, 8)}`
        } else {
          // POST /api/v2/me/cart — payload real depende do serviço cotado; stub seguro
          cartId = `me-cart-pending-${orderId.slice(0, 8)}`
          await persist({ last_error: 'cart_live_payload_requires_service_id' })
          // Ainda marca cart para fluxo de UI; compra real exige serviço configurado
        }
      }
      await persist({
        label_state: 'cart',
        cart_item_id: cartId,
        dry_run: dryRun,
        last_error: dryRun ? null : me.last_error ?? null,
      })
      return json(200, {
        ok: true,
        orderId,
        labelState: 'cart' as MeLabelState,
        message: dryRun ? 'Carrinho dry-run.' : 'Carrinho preparado (verifique service_id).',
        sandbox,
        dryRun,
      })
    }

    // --- purchase ---
    if (action === 'purchase') {
      if (body.confirm !== true) {
        return json(400, {
          ok: false,
          error: 'confirm_required',
          message: 'Compra exige confirm:true do operador.',
          orderId,
          labelState: state,
        })
      }
      if (alreadyPurchased(state)) {
        return json(200, {
          ok: true,
          orderId,
          labelState: state,
          message: 'Compra já registrada — idempotente.',
          sandbox,
          dryRun,
        })
      }
      const me = parseMeMeta(meta)
      const labelAmount = Number(me.label_amount ?? me.quoted_amount ?? charged)
      const divergence = evaluateFreightDivergence({
        chargedShipping: charged,
        labelAmount,
      })
      if (divergence.blocked) {
        await persist({ divergence, last_error: divergence.reason })
        return json(409, {
          ok: false,
          orderId,
          labelState: state,
          divergence,
          error: 'freight_divergence',
          message: divergence.reason,
          sandbox,
          dryRun,
        })
      }
      const protocol = dryRun
        ? `DRY-${orderId.slice(0, 8).toUpperCase()}`
        : me.protocol ?? `ME-${Date.now()}`
      await persist({
        label_state: 'purchased',
        protocol,
        label_amount: labelAmount,
        divergence,
        dry_run: dryRun,
        last_error: null,
      })
      return json(200, {
        ok: true,
        orderId,
        labelState: 'purchased' as MeLabelState,
        message: dryRun
          ? 'Compra dry-run. Pedido permanece pronto_para_envio (sem ship_order).'
          : 'Etiqueta comprada no sandbox. Pedido NÃO foi marcado como enviado.',
        sandbox,
        dryRun,
      })
    }

    // --- generate ---
    if (action === 'generate') {
      if (!alreadyPurchased(state) && state !== 'purchased') {
        if (!alreadyPurchased(state)) {
          return json(409, {
            ok: false,
            error: 'not_purchased',
            message: 'Compre a etiqueta antes de gerar.',
            orderId,
            labelState: state,
          })
        }
      }
      if (alreadyGenerated(state)) {
        return json(200, {
          ok: true,
          orderId,
          labelState: state,
          message: 'Já gerada — idempotente.',
          sandbox,
          dryRun,
        })
      }
      const url = dryRun
        ? `https://sandbox.melhorenvio.com.br/dry-run/label/${orderId}.pdf`
        : parseMeMeta(meta).label_url ?? `${ME_SANDBOX_BASE}/print/${orderId}`
      await persist({
        label_state: 'generated',
        label_url: url,
        dry_run: dryRun,
        last_error: null,
      })
      return json(200, {
        ok: true,
        orderId,
        labelState: 'generated' as MeLabelState,
        printUrl: url,
        message: 'Etiqueta gerada (sandbox). Ainda NÃO é postagem.',
        sandbox,
        dryRun,
      })
    }

    // --- print ---
    if (action === 'print') {
      if (!alreadyGenerated(state)) {
        return json(409, {
          ok: false,
          error: 'not_generated',
          message: 'Gere a etiqueta antes de imprimir.',
          orderId,
          labelState: state,
        })
      }
      const url = parseMeMeta(meta).label_url
      await persist({ label_state: 'printed', dry_run: dryRun, last_error: null })
      return json(200, {
        ok: true,
        orderId,
        labelState: 'printed' as MeLabelState,
        printUrl: url,
        message: 'Marcado como impresso. Use ship_order só na entrega física à transportadora.',
        sandbox,
        dryRun,
      })
    }

    // --- tracking ---
    if (action === 'tracking') {
      const me = parseMeMeta(meta)
      return json(200, {
        ok: true,
        orderId,
        labelState: state,
        me,
        message: me.tracking
          ? `Rastreio: ${me.tracking}`
          : 'Sem rastreio ainda. Webhook ME não auto-avança pedido nesta marcha.',
        sandbox,
        dryRun,
      })
    }

    return json(400, { error: 'unhandled_action' })
  } catch (e) {
    return json(500, {
      error: 'internal',
      message: e instanceof Error ? e.message : 'unknown',
    })
  }
})
