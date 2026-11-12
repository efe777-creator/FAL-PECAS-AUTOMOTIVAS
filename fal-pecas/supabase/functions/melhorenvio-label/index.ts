/**
 * FAL — melhorenvio-label
 *
 * Máquina idempotente: quote → prepare (cart) → purchase → generate → print / tracking / status.
 * NÃO chama ship_order / deliver_order.
 * Só opera pedidos em pronto_para_envio | preparando_envio.
 * Secrets: MELHOR_ENVIO_TOKEN, MELHOR_ENVIO_USER_AGENT, MELHOR_ENVIO_API_BASE.
 * Sem token → dry_run local. Ambiente = meRuntimeMode() (sandbox default / live se API prod).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  alreadyGenerated,
  alreadyPurchased,
  labelStateOf,
  meAuthHeaders,
  meApiBase,
  meFromDocumentFields,
  meRuntimeMode,
  meToDocument,
  mergeMeMeta,
  parseMeMeta,
  type MeLabelState,
  type MeMeta,
} from '../_shared/melhorEnvioCore.ts'
import {
  evaluateMePurchaseGates,
  resolveFreightDivergenceForPurchase,
  type DivergenceOverride,
} from '../_shared/meLabelPurchaseGates.ts'

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
    const meToken = (Deno.env.get('MELHOR_ENVIO_TOKEN') ?? '')
      .trim()
      .replace(/^Bearer\s+/i, '')
    const meUa = (Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'FAL Pecas Automotivas (efe.comercioltda@gmail.com)').trim()
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
    const meMode = meRuntimeMode()
    const sandbox = meMode === 'sandbox'
    if (!shipment) {
      const { data: inserted } = await admin
        .from('shipments')
        .insert({
          order_id: orderId,
          provider: sandbox ? 'melhorenvio_sandbox' : 'melhorenvio',
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
    const addrSnap = (order.address_snapshot ?? {}) as Record<string, unknown>
    const destPostal = String(addrSnap.postal_code ?? addrSnap.cep ?? addrSnap.zip ?? '')
      .replace(/\D/g, '')
      .slice(0, 8)

    const { data: originRow } = await admin
      .from('store_shipping_origin')
      .select(
        'postal_code, street, number, complement, district, city, state, sender_name, document, phone',
      )
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    const originPostal = String(originRow?.postal_code ?? '')
      .replace(/\D/g, '')
      .slice(0, 8)

    async function persist(patch: MeMeta, extraShipment?: Record<string, unknown>) {
      const nextMeta = mergeMeMeta(meta, patch)
      Object.assign(meta, nextMeta)
      const { error } = await admin
        .from('shipments')
        .update({
          metadata: nextMeta,
          provider: 'melhorenvio',
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
          const meMeta = parseMeMeta(meta)
          const vol = (meMeta.volumes ?? {}) as Record<string, unknown>
          if (originPostal.length !== 8 || destPostal.length !== 8) {
            await persist({ last_error: 'origin_or_dest_postal_missing' })
            return json(422, {
              ok: false,
              orderId,
              labelState: state,
              error: 'postal_missing',
              message: 'CEP origem (store_shipping_origin) ou destino ausente.',
              sandbox,
            })
          }
          const res = await fetch(`${meApiBase()}/api/v2/me/shipment/calculate`, {
            method: 'POST',
            headers: meAuthHeaders(meToken!, meUa),
            body: JSON.stringify({
              from: { postal_code: originPostal },
              to: { postal_code: destPostal },
              products: [
                {
                  id: 'pkg',
                  width: Number(pkg.widthCm ?? vol.widthCm ?? 11),
                  height: Number(pkg.heightCm ?? vol.heightCm ?? 2),
                  length: Number(pkg.lengthCm ?? vol.lengthCm ?? 16),
                  weight: Number(pkg.weightKg ?? vol.weightKg ?? 0.3),
                  insurance_value: charged > 0 ? charged : 1,
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
      const prevVol = parseMeMeta(meta).volumes
      await persist({
        label_state: 'quoted',
        quoted_amount: labelAmount,
        label_amount: labelAmount,
        // Não apagar volumes do packing snapshot se a calculate não devolver packages.
        volumes: volumes ?? prevVol ?? null,
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
          : sandbox
            ? 'Cotação Melhor Envio (sandbox) ok.'
            : 'Cotação Melhor Envio (produção) ok.',
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
          const serviceId = Number(me.service_id ?? body.serviceId ?? 0)
          if (!serviceId) {
            await persist({ last_error: 'service_id_required_for_cart' })
            return json(422, {
              ok: false,
              orderId,
              labelState: state,
              error: 'service_id_required',
              message: 'service_id ausente no snapshot ME — recote ou informe no body.',
              sandbox,
            })
          }
          if (!originRow || originPostal.length !== 8 || destPostal.length !== 8) {
            await persist({ last_error: 'origin_or_dest_incomplete' })
            return json(422, {
              ok: false,
              error: 'address_incomplete',
              message: 'Origem/destino incompletos para cart ME.',
              orderId,
              labelState: state,
              sandbox,
            })
          }
          const vol = (me.volumes ?? {}) as Record<string, unknown>
          // Marcha 3/5: preferir volumes do packing do pedido (fonte neutra)
          const packingVols = Array.isArray((meta as { packing?: { volumes?: unknown } }).packing?.volumes)
            ? ((meta as { packing: { volumes: Record<string, unknown>[] } }).packing.volumes)
            : []
          const meCartVolumes =
            packingVols.length > 0
              ? packingVols.map((pv) => ({
                  height: Number(pv.heightCm ?? 2),
                  width: Number(pv.widthCm ?? 11),
                  length: Number(pv.lengthCm ?? 16),
                  weight: Number(pv.weightKg ?? 0.3),
                }))
              : [
                  {
                    height: Number(vol.heightCm ?? 2),
                    width: Number(vol.widthCm ?? 11),
                    length: Number(vol.lengthCm ?? 16),
                    weight: Number(vol.weightKg ?? 0.3),
                  },
                ]
          const fromDoc = meFromDocumentFields(String(originRow.document ?? ''))
          const toDoc = meToDocument(String(addrSnap.document ?? addrSnap.cpf ?? ''))
          const cartBody = {
            service: serviceId,
            from: {
              name: String(originRow.sender_name ?? 'FAL'),
              phone: String(originRow.phone ?? ''),
              email: 'logistica@falpecas.local',
              ...fromDoc,
              address: String(originRow.street ?? ''),
              number: String(originRow.number ?? ''),
              complement: String(originRow.complement ?? ''),
              district: String(originRow.district ?? ''),
              city: String(originRow.city ?? ''),
              country_id: 'BR',
              postal_code: originPostal,
              state_abbr: String(originRow.state ?? '').slice(0, 2),
            },
            to: {
              name: String(addrSnap.recipient ?? 'Destinatario'),
              phone: String(addrSnap.phone ?? '11999999999').replace(/\D/g, '') || '11999999999',
              email: 'cliente@falpecas.local',
              document: toDoc,
              address: String(addrSnap.street ?? ''),
              number: String(addrSnap.number ?? ''),
              complement: String(addrSnap.complement ?? ''),
              district: String(addrSnap.district ?? ''),
              city: String(addrSnap.city ?? ''),
              country_id: 'BR',
              postal_code: destPostal,
              state_abbr: String(addrSnap.state ?? '').slice(0, 2),
            },
            products: [
              {
                name: `Pedido ${orderId.slice(0, 8)}`,
                quantity: 1,
                unitary_value: charged > 0 ? charged : 1,
              },
            ],
            volumes: meCartVolumes,
            options: {
              insurance_value: charged > 0 ? charged : 1,
              receipt: false,
              own_hand: false,
              reverse: false,
              non_commercial: true,
              platform: 'FAL Pecas',
              tags: [{ tag: orderId, url: null }],
            },
          }
          const cartRes = await fetch(`${meApiBase()}/api/v2/me/cart`, {
            method: 'POST',
            headers: meAuthHeaders(meToken!, meUa),
            body: JSON.stringify(cartBody),
          })
          const cartJson = (await cartRes.json().catch(() => null)) as Record<string, unknown> | null
          if (!cartRes.ok || !cartJson?.id) {
            await persist({
              last_error: `cart_http_${cartRes.status}:${JSON.stringify(cartJson).slice(0, 180)}`,
            })
            return json(502, {
              ok: false,
              orderId,
              labelState: state,
              error: 'me_cart_failed',
              message: 'Falha ao inserir frete no carrinho Melhor Envio sandbox.',
              sandbox,
            })
          }
          cartId = String(cartJson.id)
        }
      }
      await persist({
        label_state: 'cart',
        cart_item_id: cartId,
        dry_run: dryRun,
        last_error: null,
      })
      return json(200, {
        ok: true,
        orderId,
        labelState: 'cart' as MeLabelState,
        message: dryRun ? 'Carrinho dry-run.' : 'Carrinho Melhor Envio preparado.',
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

      // Reconcile / limpa lock preso
      const meEarly = parseMeMeta(meta)
      if (meEarly.purchase_in_flight && meEarly.protocol) {
        await persist({
          label_state: 'purchased',
          purchase_in_flight: false,
          last_error: null,
        })
        return json(200, {
          ok: true,
          orderId,
          labelState: 'purchased' as MeLabelState,
          message: 'Compra reconciliada (já havia protocolo) — sem 2ª compra.',
          sandbox,
          dryRun,
        })
      }
      if (meEarly.purchase_in_flight && !meEarly.protocol) {
        // Lock órfão (timeout sem protocolo) — libera para nova tentativa auditável
        await persist({
          purchase_in_flight: false,
          last_error: 'purchase_in_flight_cleared',
        })
      }

      const { data: payRows } = await admin
        .from('payments')
        .select('status')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(5)
      const payStatus =
        Array.isArray(payRows) && payRows[0]?.status != null ? String(payRows[0].status) : null

      const { data: packingOkRpc, error: packingErr } = await admin.rpc(
        'order_packing_is_complete',
        { p_order_id: orderId },
      )
      const packingComplete = packingErr ? false : packingOkRpc === true

      const cancelled = orderStatus === 'cancelado'
      const gates = evaluateMePurchaseGates({
        orderStatus,
        labelState: state,
        paymentStatus: payStatus,
        packingComplete,
        orderCancelledOrRefunded: cancelled || payStatus === 'refunded',
      })
      if (!gates.ok) {
        await persist({ last_error: gates.blockers[0] ?? 'purchase_gate' })
        return json(409, {
          ok: false,
          orderId,
          labelState: state,
          error: gates.blockers[0] ?? 'purchase_gate',
          blockers: gates.blockers,
          message: gates.message,
          sandbox,
          dryRun,
        })
      }

      const me = parseMeMeta(meta)
      const labelAmount = Number(me.label_amount ?? me.quoted_amount ?? charged)
      const rawOverride = body.divergenceOverride as DivergenceOverride | null | undefined
      const resolved = resolveFreightDivergenceForPurchase({
        chargedShipping: charged,
        labelAmount,
        override: rawOverride ?? null,
      })
      const divergence = resolved.divergence
      if (resolved.blocked) {
        await persist({ divergence, last_error: 'freight_divergence' })
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
      let protocol = me.protocol ?? null
      if (dryRun) {
        protocol = `DRY-${orderId.slice(0, 8).toUpperCase()}`
      } else {
        const cartItemId = me.cart_item_id
        if (!cartItemId) {
          return json(409, {
            ok: false,
            error: 'not_in_cart',
            message: 'Prepare (cart) antes de comprar.',
            orderId,
            labelState: state,
          })
        }
        // Lock anti-dupla compra sob timeout
        await persist({ purchase_in_flight: true, last_error: null })
        const coRes = await fetch(`${meApiBase()}/api/v2/me/shipment/checkout`, {
          method: 'POST',
          headers: meAuthHeaders(meToken!, meUa),
          body: JSON.stringify({ orders: [cartItemId] }),
        })
        const coJson = (await coRes.json().catch(() => null)) as Record<string, unknown> | null
        if (!coRes.ok) {
          // Reconcile: se ME já debitou / protocolo existe no body de erro conhecido, não limpa só o lock
          const maybeProtocol = String(
            (coJson as { purchase?: { protocol?: string } } | null)?.purchase?.protocol ??
              (coJson as { protocol?: string } | null)?.protocol ??
              '',
          )
          if (maybeProtocol) {
            await persist({
              label_state: 'purchased',
              protocol: maybeProtocol,
              label_amount: labelAmount,
              divergence,
              purchase_in_flight: false,
              dry_run: false,
              last_error: null,
              divergence_override: resolved.overrideApplied
                ? { reason: resolved.reason, at: new Date().toISOString(), by: user.id }
                : null,
            })
            return json(200, {
              ok: true,
              orderId,
              labelState: 'purchased' as MeLabelState,
              message: 'Checkout com resposta ambígua — reconciliado com protocolo (sem 2ª compra).',
              sandbox,
              dryRun,
            })
          }
          await persist({
            purchase_in_flight: false,
            last_error: `checkout_http_${coRes.status}:${JSON.stringify(coJson).slice(0, 180)}`,
            divergence,
          })
          return json(502, {
            ok: false,
            orderId,
            labelState: state,
            error: 'me_checkout_failed',
            message: 'Falha no checkout Melhor Envio (saldo sandbox?). Não repita às cegas — confira status.',
            sandbox,
          })
        }
        const purchase = (coJson?.purchase ?? coJson) as Record<string, unknown> | undefined
        protocol = String(purchase?.protocol ?? me.protocol ?? cartItemId)
      }
      await persist({
        label_state: 'purchased',
        protocol,
        label_amount: labelAmount,
        divergence,
        purchase_in_flight: false,
        dry_run: dryRun,
        last_error: null,
        divergence_override: resolved.overrideApplied
          ? { reason: resolved.reason, at: new Date().toISOString(), by: user.id }
          : null,
      })
      return json(200, {
        ok: true,
        orderId,
        labelState: 'purchased' as MeLabelState,
        message: dryRun
          ? 'Compra dry-run. Pedido permanece pronto_para_envio (sem ship_order).'
          : 'Etiqueta comprada. Pedido NÃO foi marcado como enviado.',
        sandbox,
        dryRun,
        overrideApplied: resolved.overrideApplied,
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
      let url = parseMeMeta(meta).label_url
      const meNow = parseMeMeta(meta)
      const orderRef = meNow.cart_item_id
      if (dryRun) {
        url = `https://sandbox.melhorenvio.com.br/dry-run/label/${orderId}.pdf`
      } else if (orderRef) {
        const genRes = await fetch(`${meApiBase()}/api/v2/me/shipment/generate`, {
          method: 'POST',
          headers: meAuthHeaders(meToken!, meUa),
          body: JSON.stringify({ orders: [orderRef] }),
        })
        if (!genRes.ok) {
          const errBody = await genRes.text().catch(() => '')
          await persist({ last_error: `generate_http_${genRes.status}:${errBody.slice(0, 160)}` })
          return json(502, {
            ok: false,
            orderId,
            labelState: state,
            error: 'me_generate_failed',
            message: 'Falha ao gerar etiqueta no Melhor Envio.',
            sandbox,
          })
        }
        url = url ?? `${meApiBase()}/print/${orderRef}`
      }
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
      let url = parseMeMeta(meta).label_url
      const orderRef = parseMeMeta(meta).cart_item_id
      if (!dryRun && orderRef) {
        const printRes = await fetch(`${meApiBase()}/api/v2/me/shipment/print`, {
          method: 'POST',
          headers: meAuthHeaders(meToken!, meUa),
          body: JSON.stringify({ mode: 'private', orders: [orderRef] }),
        })
        const printJson = (await printRes.json().catch(() => null)) as { url?: string } | null
        if (printRes.ok && printJson?.url) url = printJson.url
      }
      await persist({ label_state: 'printed', label_url: url, dry_run: dryRun, last_error: null })
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
