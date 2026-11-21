/**
 * Smoke pós-venda ME reversa — seed entregue + authorize + generate (dry-run se sem token).
 * Não compra etiqueta live; cart_item_id sintético basta para dry-run da Edge.
 */
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const PROJECT_REF = 'wtbpwuiayednvlhvuhbh'
const URL = `https://${PROJECT_REF}.supabase.co`
const STAFF_EMAIL = 'efe.comercioltda@gmail.com'
const PAYMENT_REF = `SMOKE-ME-REV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`

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
  return { token, userClient }
}

async function seedEntregueMe(admin) {
  const orderId = randomUUID()
  const itemId = randomUUID()
  const shipId = randomUUID()
  const occurrenceId = randomUUID()
  const meCartId = randomUUID()
  const productId = 'ffc46276-f31f-4c67-a60d-551d55e9fde4'
  const customerId = '18288558-049b-436a-a5ef-add3af9929eb'
  const priceListId = 'a1111111-1111-1111-1111-111111111101'
  const shippingAmount = 14.9
  const address = {
    label: 'SMOKE ME REV',
    recipient: 'Smoke Reverse',
    postal_code: '01310100',
    street: 'Avenida Paulista',
    number: '1000',
    complement: 'Smoke Rev',
    district: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    phone: '11999999999',
    email: 'smoke-rev@falpecas.local',
  }
  const packingVolumeId = randomUUID()
  const meMeta = {
    me: {
      label_state: 'generated',
      cart_item_id: meCartId,
      service_id: 1,
      volumes: {
        weightKg: 0.5,
        heightCm: 10,
        widthCm: 15,
        lengthCm: 20,
      },
    },
    packing: {
      allocationStatus: 'complete',
      volumes: [
        {
          id: packingVolumeId,
          lengthCm: 20,
          widthCm: 15,
          heightCm: 10,
          weightKg: 0.5,
          lines: [{ orderItemId: itemId, quantity: 1 }],
        },
      ],
      updatedBy: 'smoke-me-reverse',
    },
  }

  const { error: oErr } = await admin.from('orders').insert({
    id: orderId,
    customer_id: customerId,
    status: 'entregue',
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
    name_snapshot: 'TERMINAL DE DIREÇÃO (SMOKE ME REV)',
    unit_price: 1,
    quantity: 1,
    price_list_id: priceListId,
    availability: 'disponivel',
    separated: true,
  })
  if (iErr) throw iErr

  const { error: pErr } = await admin.from('payments').insert({
    order_id: orderId,
    provider: 'smoke',
    status: 'approved',
    amount: 1 + shippingAmount,
    method: 'pix',
    external_ref: PAYMENT_REF,
    metadata: { smoke: true, note: 'ME reverse dry-run' },
  })
  if (pErr) throw pErr

  const deliveredAt = new Date().toISOString()
  const { error: sErr } = await admin.from('shipments').insert({
    id: shipId,
    order_id: orderId,
    provider: 'melhorenvio',
    status: 'delivered',
    amount: shippingAmount,
    carrier: 'Correios',
    service: 'PAC',
    tracking_code: `SMOKE-IDA-${orderId.slice(0, 8).toUpperCase()}`,
    delivered_at: deliveredAt,
    metadata: meMeta,
  })
  if (sErr) throw sErr

  await admin.from('order_status_history').insert({
    order_id: orderId,
    status: 'entregue',
    note: 'Seed smoke ME reverse',
  })

  return { orderId, occurrenceId, meCartId, itemId }
}

async function seedOwnFallback(admin) {
  const orderId = randomUUID()
  const itemId = randomUUID()
  const shipId = randomUUID()
  const productId = 'ffc46276-f31f-4c67-a60d-551d55e9fde4'
  const customerId = '18288558-049b-436a-a5ef-add3af9929eb'
  const priceListId = 'a1111111-1111-1111-1111-111111111101'

  await admin.from('orders').insert({
    id: orderId,
    customer_id: customerId,
    status: 'entregue',
    subtotal: 1,
    shipping_amount: 25,
    total: 26,
    address_snapshot: { postal_code: '01310100', city: 'São Paulo', state: 'SP' },
    payment_ref: `${PAYMENT_REF}-OWN`,
    inventory_mode_at_order: 'sem_estoque',
    idempotency_key: randomUUID(),
  })
  await admin.from('order_items').insert({
    id: itemId,
    order_id: orderId,
    product_id: productId,
    sku: 'TDI0303',
    name_snapshot: 'SMOKE OWN FALLBACK',
    unit_price: 1,
    quantity: 1,
    price_list_id: priceListId,
    availability: 'disponivel',
    separated: true,
  })
  await admin.from('payments').insert({
    order_id: orderId,
    provider: 'smoke',
    status: 'approved',
    amount: 26,
    method: 'pix',
    external_ref: `${PAYMENT_REF}-OWN`,
  })
  await admin.from('shipments').insert({
    id: shipId,
    order_id: orderId,
    provider: 'own',
    status: 'delivered',
    amount: 25,
    delivered_at: new Date().toISOString(),
    metadata: { packing: { volumes: [{ widthCm: 11, heightCm: 2, lengthCm: 16, weightKg: 0.3 }] } },
  })
  return orderId
}

async function invokeReverse(token, anon, body) {
  const res = await fetch(`${URL}/functions/v1/melhorenvio-reverse`, {
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

  const ownId = await seedOwnFallback(admin)
  console.log(JSON.stringify({ step: 'seed_own_fallback', orderId: ownId }))

  const { orderId, occurrenceId } = await seedEntregueMe(admin)
  console.log(JSON.stringify({ step: 'seed_me', orderId, occurrenceId, payment_ref: PAYMENT_REF }))

  const { token, userClient } = await staffAccessToken(service, anon)
  console.log(JSON.stringify({ step: 'auth', staff: STAFF_EMAIL, ok: true }))

  // Overload remoto exposto: (action, gravidade, note, occurrence_id, order_id, solucao, tipo, visibility)
  const { data: opened, error: openErr } = await userClient.rpc('admin_occurrence_action', {
    p_order_id: orderId,
    p_action: 'open',
    p_occurrence_id: null,
    p_tipo: 'pos_venda_devolucao',
    p_gravidade: 'media',
    p_note: 'Smoke ME reverse — solicitação devolução · analisar_pos_venda',
    p_solucao: null,
    p_visibility: 'customer',
  })
  if (openErr) {
    console.log(JSON.stringify({ step: 'open_error', error: openErr.message, details: openErr }))
    throw new Error(openErr.message || 'open_failed')
  }
  const oid = String(opened?.occurrence_id ?? occurrenceId)
  console.log(JSON.stringify({ step: 'open', occurrence_id: oid, event: opened?.event_type }))

  const { data: started, error: startErr } = await userClient.rpc('admin_post_sale_case_action', {
    p_order_id: orderId,
    p_occurrence_id: oid,
    p_action: 'start',
  })
  if (startErr) {
    console.log(JSON.stringify({ step: 'start_error', error: startErr.message, details: startErr }))
    throw new Error(startErr.message || 'start_failed')
  }
  console.log(JSON.stringify({ step: 'start', stage: started?.stage }))

  const { data: authz, error: authErr } = await userClient.rpc('admin_post_sale_case_action', {
    p_order_id: orderId,
    p_occurrence_id: oid,
    p_action: 'authorize',
    p_return_mode: 'me_codigo',
    p_service_override: 'pac',
    p_note: 'Smoke authorize PAC',
  })
  if (authErr) {
    console.log(JSON.stringify({ step: 'authorize_error', error: authErr.message, details: authErr }))
    throw new Error(authErr.message || 'authorize_failed')
  }
  console.log(JSON.stringify({ step: 'authorize', stage: authz?.stage, return_mode: authz?.return_mode }))

  const st = await invokeReverse(token, anon, {
    action: 'status',
    orderId,
    occurrenceId: oid,
    forceDryRun: true,
  })
  console.log(
    JSON.stringify({
      step: 'reverse_status',
      http: st.status,
      eligible: st.json.eligible,
      dryRun: st.json.dryRun,
      sandbox: st.json.sandbox,
      error: st.json.error,
    }),
  )

  const gen = await invokeReverse(token, anon, {
    action: 'generate',
    orderId,
    occurrenceId: oid,
    serviceOverride: 'pac',
    forceDryRun: true,
  })
  console.log(
    JSON.stringify({
      step: 'generate',
      http: gen.status,
      ok: gen.json.ok,
      trackingCode: gen.json.trackingCode,
      dryRun: gen.json.dryRun,
      sandbox: gen.json.sandbox,
      message: gen.json.message,
      error: gen.json.error,
    }),
  )

  const { data: events } = await admin
    .from('order_events')
    .select('event_type, payload, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(6)

  const withCode = (events ?? []).find(
    (e) => e.payload && typeof e.payload === 'object' && e.payload.me_reverse?.tracking_code,
  )
  const gate =
    gen.json.ok === true && Boolean(gen.json.trackingCode) && Boolean(withCode)
      ? 'PASS'
      : 'FAIL'

  console.log(
    JSON.stringify({
      step: 'done',
      gate,
      orderId,
      occurrenceId: oid,
      ownFallbackOrderId: ownId,
      trackingCode: gen.json.trackingCode ?? null,
      eventHasMeReverse: Boolean(withCode),
    }),
  )

  if (gate !== 'PASS') process.exitCode = 1
}

main().catch((e) => {
  const msg =
    e instanceof Error
      ? e.message
      : e && typeof e === 'object'
        ? JSON.stringify(e)
        : String(e)
  console.error(JSON.stringify({ step: 'fatal', error: msg }))
  process.exit(1)
})
