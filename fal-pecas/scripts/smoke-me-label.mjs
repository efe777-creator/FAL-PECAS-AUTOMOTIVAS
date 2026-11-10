/**
 * Smoke ME etiqueta Expedição — seed pedido pronto_para_envio + ciclo Edge.
 * Purchase só se a Edge reportar sandbox=true (nunca compra live automática).
 */
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const PROJECT_REF = 'wtbpwuiayednvlhvuhbh'
const URL = `https://${PROJECT_REF}.supabase.co`
const STAFF_EMAIL = 'teste@gmail.com'
const PAYMENT_REF = `SMOKE-ME-LABEL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`

function apiKeys() {
  if (process.env.SMOKE_SUPABASE_ANON_KEY && process.env.SMOKE_SUPABASE_SERVICE_ROLE_KEY) {
    return {
      anon: process.env.SMOKE_SUPABASE_ANON_KEY,
      service: process.env.SMOKE_SUPABASE_SERVICE_ROLE_KEY,
    }
  }
  const raw = execSync(`npx supabase projects api-keys --remote=${PROJECT_REF} -o json`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const arrStart = raw.indexOf('[')
  const objStart = raw.indexOf('{')
  const start = arrStart >= 0 && (objStart < 0 || arrStart < objStart) ? arrStart : objStart
  const endChar = raw[start] === '[' ? ']' : '}'
  const end = raw.lastIndexOf(endChar)
  if (start < 0 || end < 0) throw new Error('api-keys json not found')
  const parsed = JSON.parse(raw.slice(start, end + 1))
  const keys = Array.isArray(parsed) ? parsed : (parsed.keys ?? [])
  const anon = keys.find((k) => k.name === 'anon' || k.id === 'anon')?.api_key
  const service = keys.find((k) => k.name === 'service_role' || k.id === 'service_role')?.api_key
  if (!anon || !service) throw new Error('api keys missing')
  return { anon, service }
}

async function staffAccessToken(service, anon) {
  const admin = createClient(URL, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: STAFF_EMAIL,
  })
  if (error) throw error
  const hashed = data?.properties?.hashed_token
  if (!hashed) throw new Error('no hashed_token from generateLink')
  const userClient = createClient(URL, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: verified, error: vErr } = await userClient.auth.verifyOtp({
    token_hash: hashed,
    type: 'magiclink',
  })
  if (vErr) throw vErr
  const token = verified.session?.access_token
  if (!token) throw new Error('no access_token after verifyOtp')
  return token
}

async function seedOrder(admin) {
  const orderId = randomUUID()
  const itemId = randomUUID()
  const shipId = randomUUID()
  const productId = 'ffc46276-f31f-4c67-a60d-551d55e9fde4'
  const customerId = '18288558-049b-436a-a5ef-add3af9929eb'
  const priceListId = 'a1111111-1111-1111-1111-111111111101'
  const shippingAmount = 11.15
  const address = {
    label: 'SMOKE ME',
    recipient: 'Smoke ME Label',
    postal_code: '01310100',
    street: 'Avenida Paulista',
    number: '1000',
    complement: 'Smoke',
    district: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  }
  const meMeta = {
    me: {
      label_state: 'none',
      service_id: 2,
      quoted_amount: shippingAmount,
      volumes: {
        packingMode: 'box_template',
        boxName: 'Caixa P',
        boxTemplateId: '81c59f38-13d5-47b8-ba59-6f20cdcbfa2a',
        weightKg: 0.5,
        heightCm: 10,
        widthCm: 15,
        lengthCm: 20,
        itemsWeightKg: 0.35,
        emptyWeightKg: 0.15,
      },
    },
    quote_id: randomUUID(),
    option_id: `meq:smoke:${Date.now()}:2`,
    service_id: 2,
    service_code: '2',
  }

  const { error: oErr } = await admin.from('orders').insert({
    id: orderId,
    customer_id: customerId,
    status: 'pronto_para_envio',
    subtotal: 1,
    shipping_amount: shippingAmount,
    total: 1 + shippingAmount,
    address_snapshot: address,
    payment_ref: PAYMENT_REF,
    inventory_mode_at_order: 'sem_estoque',
    idempotency_key: randomUUID(),
  })
  if (oErr) throw oErr

  const { error: iErr } = await admin.from('order_items').insert({
    id: itemId,
    order_id: orderId,
    product_id: productId,
    sku: 'TDI0303',
    name_snapshot: 'TERMINAL DE DIREÇÃO (SMOKE ME)',
    unit_price: 1,
    quantity: 1,
    price_list_id: priceListId,
    availability: 'disponivel',
    separated: true,
  })
  if (iErr) throw iErr

  const { error: sErr } = await admin.from('shipments').insert({
    id: shipId,
    order_id: orderId,
    provider: 'melhorenvio',
    status: 'pending',
    amount: shippingAmount,
    carrier: 'Correios',
    service: 'SEDEX',
    metadata: meMeta,
  })
  if (sErr) throw sErr

  await admin.from('order_status_history').insert({
    order_id: orderId,
    status: 'pronto_para_envio',
    note: 'Seed smoke ME etiqueta',
  })

  return orderId
}

async function invokeLabel(token, anon, body) {
  const res = await fetch(`${URL}/functions/v1/melhorenvio-label`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

async function main() {
  const { anon, service } = apiKeys()
  const admin = createClient(URL, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  let orderId = process.env.SMOKE_ORDER_ID || ''
  if (orderId) {
    // Reancora volumes se quote anterior zerou o packing snapshot.
    const { data: ship } = await admin
      .from('shipments')
      .select('id, metadata')
      .eq('order_id', orderId)
      .maybeSingle()
    if (ship?.id) {
      const meta = ship.metadata && typeof ship.metadata === 'object' ? { ...ship.metadata } : {}
      const me = meta.me && typeof meta.me === 'object' ? { ...meta.me } : {}
      if (!me.volumes) {
        me.volumes = {
          packingMode: 'box_template',
          boxName: 'Caixa P',
          boxTemplateId: '81c59f38-13d5-47b8-ba59-6f20cdcbfa2a',
          weightKg: 0.5,
          heightCm: 10,
          widthCm: 15,
          lengthCm: 20,
          itemsWeightKg: 0.35,
          emptyWeightKg: 0.15,
        }
        me.last_error = null
        meta.me = me
        await admin.from('shipments').update({ metadata: meta }).eq('id', ship.id)
      }
    }
    console.log(JSON.stringify({ step: 'reuse', orderId }))
  } else {
    orderId = await seedOrder(admin)
    console.log(JSON.stringify({ step: 'seed', orderId, payment_ref: PAYMENT_REF }))
  }

  const token = await staffAccessToken(service, anon)
  console.log(JSON.stringify({ step: 'auth', staff: STAFF_EMAIL, ok: true }))

  const status = await invokeLabel(token, anon, { action: 'status', orderId })
  console.log(JSON.stringify({ step: 'status', http: status.status, sandbox: status.json.sandbox, dryRun: status.json.dryRun, labelState: status.json.labelState, error: status.json.error }))

  const quote = await invokeLabel(token, anon, { action: 'quote', orderId })
  console.log(JSON.stringify({ step: 'quote', http: quote.status, ok: quote.json.ok, labelState: quote.json.labelState, sandbox: quote.json.sandbox, dryRun: quote.json.dryRun, message: quote.json.message, error: quote.json.error }))

  const prepare = await invokeLabel(token, anon, { action: 'prepare', orderId })
  console.log(JSON.stringify({ step: 'prepare', http: prepare.status, ok: prepare.json.ok, labelState: prepare.json.labelState, sandbox: prepare.json.sandbox, dryRun: prepare.json.dryRun, message: prepare.json.message, error: prepare.json.error, detail: prepare.json.error === 'me_cart_failed' ? 'see shipment.me.last_error' : undefined }))

  if (!prepare.json.ok) {
    const { data: ship } = await admin
      .from('shipments')
      .select('metadata')
      .eq('order_id', orderId)
      .maybeSingle()
    console.log(JSON.stringify({ step: 'prepare_error_detail', last_error: ship?.metadata?.me?.last_error ?? null }))
    console.log(JSON.stringify({ step: 'done', orderId, gate: 'prepare_failed' }))
    return
  }

  const sandbox = prepare.json.sandbox === true || quote.json.sandbox === true
  const dryRun = prepare.json.dryRun === true || quote.json.dryRun === true
  if (!sandbox && !dryRun) {
    console.log(JSON.stringify({ step: 'purchase', skipped: true, reason: 'ME live — compra automática bloqueada; gate humano na Expedição' }))
    console.log(JSON.stringify({ step: 'done', orderId, gate: 'purchase_live', prepare: 'ok' }))
    return
  }

  const purchase = await invokeLabel(token, anon, { action: 'purchase', orderId, confirm: true })
  console.log(JSON.stringify({ step: 'purchase', http: purchase.status, ok: purchase.json.ok, labelState: purchase.json.labelState, message: purchase.json.message, error: purchase.json.error }))

  const generate = await invokeLabel(token, anon, { action: 'generate', orderId })
  console.log(JSON.stringify({ step: 'generate', http: generate.status, ok: generate.json.ok, labelState: generate.json.labelState, message: generate.json.message, error: generate.json.error }))

  const print = await invokeLabel(token, anon, { action: 'print', orderId })
  console.log(JSON.stringify({ step: 'print', http: print.status, ok: print.json.ok, labelState: print.json.labelState, printUrl: print.json.printUrl ?? null, message: print.json.message, error: print.json.error }))

  console.log(JSON.stringify({ step: 'done', orderId, gate: null }))
}

main().catch((e) => {
  console.error(JSON.stringify({ step: 'fatal', error: String(e?.message || e) }))
  process.exit(1)
})
