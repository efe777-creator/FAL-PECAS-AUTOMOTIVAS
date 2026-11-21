/**
 * Smoke de uso completo pós-venda — cliente + operador (wtbp).
 *
 * Cobre:
 *  1) Cliente report tipado (devolução)
 *  2) Ops vê na fila Revisão (admin_list_revisao_queue_rows)
 *  3) Ops start → authorize ME → cliente generate dry-run
 *  4) Ops awaiting_piece → conference → resolve
 *  5) Variante WA: authorize return_mode=wa (sem generate)
 *
 * Não compra etiqueta live. HOLD ME live permanece.
 */
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const PROJECT_REF = 'wtbpwuiayednvlhvuhbh'
const URL = `https://${PROJECT_REF}.supabase.co`
const STAFF_EMAIL = 'efe.comercioltda@gmail.com'
const PAYMENT_REF = `SMOKE-USO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
const PRODUCT_ID = 'ffc46276-f31f-4c67-a60d-551d55e9fde4'
const CUSTOMER_ID = '18288558-049b-436a-a5ef-add3af9929eb'
const PRICE_LIST_ID = 'a1111111-1111-1111-1111-111111111101'

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

async function magicSession(service, anon, email) {
  const admin = createClient(URL, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (error) throw error
  const hashed = data?.properties?.hashed_token
  if (!hashed) throw new Error(`no hashed_token for ${email}`)
  const userClient = createClient(URL, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: verified, error: vErr } = await userClient.auth.verifyOtp({
    token_hash: hashed,
    type: 'magiclink',
  })
  if (vErr) throw vErr
  const token = verified.session?.access_token
  if (!token) throw new Error(`no access_token for ${email}`)
  return { token, userClient, userId: verified.user?.id ?? null }
}

async function seedEntregueMe(admin, tag) {
  const orderId = randomUUID()
  const itemId = randomUUID()
  const shipId = randomUUID()
  const meCartId = randomUUID()
  const shippingAmount = 14.9
  const address = {
    label: `SMOKE USO ${tag}`,
    recipient: 'Smoke Uso Completo',
    postal_code: '01310100',
    street: 'Avenida Paulista',
    number: '1000',
    district: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    phone: '11999999999',
    email: 'smoke-uso@falpecas.local',
  }
  const packingVolumeId = randomUUID()
  const meMeta = {
    me: {
      label_state: 'generated',
      cart_item_id: meCartId,
      service_id: 1,
      volumes: { weightKg: 0.5, heightCm: 10, widthCm: 15, lengthCm: 20 },
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
      updatedBy: 'smoke-pos-venda-uso-completo',
    },
  }

  const { error: oErr } = await admin.from('orders').insert({
    id: orderId,
    customer_id: CUSTOMER_ID,
    status: 'entregue',
    subtotal: 1,
    shipping_amount: shippingAmount,
    total: 1 + shippingAmount,
    address_snapshot: address,
    payment_ref: `${PAYMENT_REF}-${tag}`,
    inventory_mode_at_order: 'sem_estoque',
    idempotency_key: randomUUID(),
  })
  if (oErr) throw oErr

  const { error: iErr } = await admin.from('order_items').insert({
    id: itemId,
    order_id: orderId,
    product_id: PRODUCT_ID,
    sku: 'TDI0303',
    name_snapshot: `SMOKE USO ${tag}`,
    unit_price: 1,
    quantity: 1,
    price_list_id: PRICE_LIST_ID,
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
    external_ref: `${PAYMENT_REF}-${tag}`,
    metadata: { smoke: true, note: `uso-completo-${tag}` },
  })
  if (pErr) throw pErr

  const { error: sErr } = await admin.from('shipments').insert({
    id: shipId,
    order_id: orderId,
    provider: 'melhorenvio',
    status: 'delivered',
    amount: shippingAmount,
    carrier: 'Correios',
    service: 'PAC',
    tracking_code: `SMOKE-IDA-${orderId.slice(0, 8).toUpperCase()}`,
    delivered_at: new Date().toISOString(),
    metadata: meMeta,
  })
  if (sErr) throw sErr

  await admin.from('order_status_history').insert({
    order_id: orderId,
    status: 'entregue',
    note: `Seed smoke uso completo ${tag}`,
  })

  return { orderId, itemId, meCartId }
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

function log(step, payload = {}) {
  console.log(JSON.stringify({ step, ...payload }))
}

async function main() {
  const { anon, service } = apiKeys()
  const admin = createClient(URL, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: cust, error: custErr } = await admin
    .from('customers')
    .select('id, profile_id')
    .eq('id', CUSTOMER_ID)
    .maybeSingle()
  if (custErr) throw custErr
  let customerEmail = null
  if (cust?.profile_id) {
    const { data: u } = await admin.auth.admin.getUserById(cust.profile_id)
    customerEmail = u?.user?.email ?? null
  }
  log('customer_lookup', {
    customerId: CUSTOMER_ID,
    email: customerEmail,
    profile_id: cust?.profile_id ?? null,
  })

  const staff = await magicSession(service, anon, STAFF_EMAIL)
  log('auth_staff', { ok: true, email: STAFF_EMAIL })

  let customer = null
  if (customerEmail) {
    try {
      customer = await magicSession(service, anon, customerEmail)
      log('auth_customer', { ok: true, email: customerEmail })
    } catch (e) {
      log('auth_customer_fallback', {
        email: customerEmail,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  } else {
    log('auth_customer_skip', { reason: 'sem email no profile do customer smoke' })
  }

  // ─── Fluxo A: ME código (cliente report → ops → generate → resolve) ───
  const me = await seedEntregueMe(admin, 'ME')
  log('seed_me', { orderId: me.orderId })

  let occurrenceId = null
  if (customer) {
    const { data: reported, error: repErr } = await customer.userClient.rpc(
      'customer_report_delivery_issue',
      {
        p_order_id: me.orderId,
        p_reason: 'Smoke uso completo — peça incompatível com o veículo',
        p_motivo_code: 'quero_devolver',
        p_scope: 'order',
        p_items: [],
        p_policy_ack: true,
      },
    )
    if (repErr) {
      log('client_report_error', { error: repErr.message, details: repErr })
      throw new Error(repErr.message || 'client_report_failed')
    }
    occurrenceId = String(reported?.occurrence_id ?? '')
    log('client_report', {
      occurrence_id: occurrenceId,
      tipo: reported?.tipo ?? null,
    })
  } else {
    const { data: opened, error: openErr } = await staff.userClient.rpc('admin_occurrence_action', {
      p_order_id: me.orderId,
      p_action: 'open',
      p_occurrence_id: null,
      p_tipo: 'pos_venda_devolucao',
      p_gravidade: 'media',
      p_note: 'Smoke uso — open staff (sem sessão cliente)',
      p_solucao: null,
      p_visibility: 'customer',
      p_prioridade: 'media',
      p_acao_necessaria: 'analisar_pos_venda',
      p_assignee_id: null,
      p_motivo_reabertura: null,
      p_motivo_encerramento: null,
    })
    if (openErr) throw new Error(openErr.message || 'open_failed')
    occurrenceId = String(opened?.occurrence_id ?? '')
    log('ops_open_fallback', { occurrence_id: occurrenceId })
  }

  const { data: queueRows, error: qErr } = await staff.userClient.rpc(
    'admin_list_revisao_queue_rows',
  )
  if (qErr) throw new Error(qErr.message || 'revisao_queue_failed')
  const inQueue = (queueRows ?? []).some((r) => r.order_id === me.orderId)
  const queueMeta = (queueRows ?? []).find((r) => r.order_id === me.orderId) ?? null
  log('ops_revisao_queue', {
    inQueue,
    tipo: queueMeta?.tipo ?? null,
    stage: queueMeta?.stage ?? null,
    return_mode: queueMeta?.return_mode ?? null,
    has_return_mode_col: queueMeta ? 'return_mode' in queueMeta : false,
  })
  if (!inQueue) throw new Error('pedido não entrou na fila revisão')

  const { data: started, error: startErr } = await staff.userClient.rpc(
    'admin_post_sale_case_action',
    {
      p_order_id: me.orderId,
      p_occurrence_id: occurrenceId,
      p_action: 'start',
    },
  )
  if (startErr) throw new Error(startErr.message || 'start_failed')
  log('ops_start', { stage: started?.stage })

  const { data: authz, error: authErr } = await staff.userClient.rpc('admin_post_sale_case_action', {
    p_order_id: me.orderId,
    p_occurrence_id: occurrenceId,
    p_action: 'authorize',
    p_return_mode: 'me_codigo',
    p_service_override: 'pac',
    p_note: 'Smoke uso authorize ME',
  })
  if (authErr) throw new Error(authErr.message || 'authorize_failed')
  log('ops_authorize_me', { stage: authz?.stage, return_mode: authz?.return_mode })

  // Cliente gera código (dry-run) — staff token ok na Edge com forceDryRun
  const gen = await invokeReverse(staff.token, anon, {
    action: 'generate',
    orderId: me.orderId,
    occurrenceId,
    serviceOverride: 'pac',
    forceDryRun: true,
  })
  log('client_generate_dry', {
    http: gen.status,
    ok: gen.json.ok,
    trackingCode: gen.json.trackingCode ?? null,
    dryRun: gen.json.dryRun,
    error: gen.json.error ?? null,
  })
  if (!gen.json.ok || !gen.json.trackingCode) {
    throw new Error(gen.json.error || 'generate_dry_failed')
  }

  const { data: awaiting, error: awErr } = await staff.userClient.rpc(
    'admin_post_sale_case_action',
    {
      p_order_id: me.orderId,
      p_occurrence_id: occurrenceId,
      p_action: 'awaiting_piece',
    },
  )
  if (awErr) throw new Error(awErr.message || 'awaiting_piece_failed')
  log('ops_awaiting_piece', { stage: awaiting?.stage })

  const { data: conf, error: confErr } = await staff.userClient.rpc('admin_post_sale_case_action', {
    p_order_id: me.orderId,
    p_occurrence_id: occurrenceId,
    p_action: 'conference',
  })
  if (confErr) throw new Error(confErr.message || 'conference_failed')
  log('ops_conference', { stage: conf?.stage })

  const { data: resolved, error: resErr } = await staff.userClient.rpc(
    'admin_post_sale_case_action',
    {
      p_order_id: me.orderId,
      p_occurrence_id: occurrenceId,
      p_action: 'resolve',
      p_solucao: 'Smoke uso — conferência OK, estorno simulado',
    },
  )
  if (resErr) throw new Error(resErr.message || 'resolve_failed')
  log('ops_resolve', { stage: resolved?.stage })

  // Pedido comercial permanece entregue
  const { data: orderRow } = await admin
    .from('orders')
    .select('status')
    .eq('id', me.orderId)
    .maybeSingle()
  log('order_status_unchanged', { status: orderRow?.status ?? null })

  // ─── Fluxo B: WA fallback ───
  const wa = await seedEntregueMe(admin, 'WA')
  log('seed_wa', { orderId: wa.orderId })
  const { data: waOpen, error: waOpenErr } = await staff.userClient.rpc('admin_occurrence_action', {
    p_order_id: wa.orderId,
    p_action: 'open',
    p_occurrence_id: null,
    p_tipo: 'pos_venda_devolucao',
    p_gravidade: 'media',
    p_note: 'Smoke uso WA',
    p_solucao: null,
    p_visibility: 'customer',
    p_prioridade: 'media',
    p_acao_necessaria: 'analisar_pos_venda',
    p_assignee_id: null,
    p_motivo_reabertura: null,
    p_motivo_encerramento: null,
  })
  if (waOpenErr) throw new Error(waOpenErr.message || 'wa_open_failed')
  const waOid = String(waOpen?.occurrence_id ?? '')
  await staff.userClient.rpc('admin_post_sale_case_action', {
    p_order_id: wa.orderId,
    p_occurrence_id: waOid,
    p_action: 'start',
  })
  const { data: waAuth, error: waAuthErr } = await staff.userClient.rpc(
    'admin_post_sale_case_action',
    {
      p_order_id: wa.orderId,
      p_occurrence_id: waOid,
      p_action: 'authorize',
      p_return_mode: 'wa',
      p_note: 'Smoke authorize WA',
    },
  )
  if (waAuthErr) throw new Error(waAuthErr.message || 'wa_authorize_failed')
  log('ops_authorize_wa', { stage: waAuth?.stage, return_mode: waAuth?.return_mode })

  const { data: queueAfter } = await staff.userClient.rpc('admin_list_revisao_queue_rows')
  const waInQueue = (queueAfter ?? []).some((r) => r.order_id === wa.orderId)
  const meStillInQueue = (queueAfter ?? []).some((r) => r.order_id === me.orderId)
  log('ops_revisao_after_resolve', {
    waInQueue,
    meResolvedOutOfQueue: !meStillInQueue,
  })

  const gate =
    inQueue &&
    gen.json.ok === true &&
    Boolean(gen.json.trackingCode) &&
    orderRow?.status === 'entregue' &&
    waAuth?.return_mode === 'wa' &&
    waInQueue &&
    !meStillInQueue
      ? 'PASS'
      : 'FAIL'

  log('done', {
    gate,
    meOrderId: me.orderId,
    meOccurrenceId: occurrenceId,
    waOrderId: wa.orderId,
    waOccurrenceId: waOid,
    trackingCode: gen.json.trackingCode ?? null,
    clientReportUsed: Boolean(customer),
    hubCanonicalPath: '/admin/pedidos?tab=logistica&fila=revisao',
  })

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
