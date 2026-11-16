/**
 * Smoke autenticado: pay-asaas-credit-card (crédito embutido).
 * Uso: node scripts/smoke-asaas-credit-embedded.mjs [orderId] [approve|decline|schema]
 *
 * - schema: só valida 400 sem PAN completo
 * - approve/decline: cartões oficiais Asaas sandbox (em produção esperamos recusa/erro)
 */
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

const PROJECT_REF = 'wtbpwuiayednvlhvuhbh'
const URL = `https://${PROJECT_REF}.supabase.co`
const ORDER_ID = process.argv[2] || 'b0304f49-b32e-4189-8c0b-e0906ee14573'
const MODE = process.argv[3] || 'schema'
const PROFILE_ID = 'ddb45683-34bf-4596-93c4-4676f423e5d4'

const CARDS = {
  approve: { number: '4539656048392220', brand: 'visa_approve' },
  decline: { number: '5184019740373151', brand: 'mc_decline' },
}

const raw = execSync(`npx supabase projects api-keys --remote=${PROJECT_REF} -o json`, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
})
const keys = JSON.parse(raw.slice(raw.indexOf('[')))
const service = keys.find((k) => k.name === 'service_role')?.api_key
const anon = keys.find((k) => k.name === 'anon' || k.name === 'publishable')?.api_key
if (!service || !anon) throw new Error('api keys missing')

const admin = createClient(URL, service, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: userData, error: userErr } = await admin.auth.admin.getUserById(PROFILE_ID)
if (userErr || !userData?.user?.email) throw userErr || new Error('user email missing')
const email = userData.user.email

const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email,
})
if (linkErr) throw linkErr
const otp = linkData.properties?.email_otp
if (!otp) throw new Error('email_otp missing from generateLink')

const userClient = createClient(URL, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const { data: sessionData, error: otpErr } = await userClient.auth.verifyOtp({
  email,
  token: otp,
  type: 'email',
})
if (otpErr || !sessionData.session?.access_token) {
  throw otpErr || new Error('verifyOtp failed')
}
const token = sessionData.session.access_token

async function invoke(body) {
  const t0 = Date.now()
  const res = await fetch(`${URL}/functions/v1/pay-asaas-credit-card`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const ms = Date.now() - t0
  const json = await res.json().catch(() => ({}))
  return { res, ms, json }
}

if (MODE === 'schema') {
  const { res, ms, json } = await invoke({ orderId: ORDER_ID })
  const ok = res.status === 400 && typeof json.error === 'string'
  console.log(
    JSON.stringify(
      {
        ok,
        mode: 'schema',
        httpStatus: res.status,
        latencyMs: ms,
        error: json.error ?? null,
        // não ecoar body completo com eventual PAN
      },
      null,
      2,
    ),
  )
  process.exit(ok ? 0 : 1)
}

const card = CARDS[MODE]
if (!card) {
  console.error('mode must be schema|approve|decline')
  process.exit(2)
}

const { data: profile } = await admin
  .from('profiles')
  .select('full_name, email, cpf_cnpj, phone, postal_code, address_number')
  .eq('id', PROFILE_ID)
  .maybeSingle()

const holderName = (profile?.full_name || 'Cliente Teste FAL').slice(0, 40)
const holderEmail = profile?.email || email
const cpf =
  String(profile?.cpf_cnpj || '').replace(/\D/g, '').length >= 11
    ? String(profile.cpf_cnpj).replace(/\D/g, '')
    : '24971563792'
const postal =
  String(profile?.postal_code || '').replace(/\D/g, '').length === 8
    ? String(profile.postal_code).replace(/\D/g, '')
    : '01310100'
const phone =
  String(profile?.phone || '').replace(/\D/g, '').length >= 10
    ? String(profile.phone).replace(/\D/g, '')
    : '11999999999'
const addressNumber = String(profile?.address_number || '100')

const { res, ms, json } = await invoke({
  orderId: ORDER_ID,
  installments: 1,
  creditCard: {
    holderName,
    number: card.number,
    expiryMonth: '12',
    expiryYear: '2030',
    ccv: '123',
  },
  creditCardHolderInfo: {
    name: holderName,
    email: holderEmail,
    cpfCnpj: cpf,
    postalCode: postal,
    addressNumber,
    phone,
    mobilePhone: phone,
  },
  deviceInfo: {
    colorDepth: 24,
    screenHeight: 844,
    screenWidth: 390,
    timeZoneOffset: 180,
    language: 'pt-BR',
    userAgent: 'fal-smoke-asaas-credit',
  },
  callbackUrl: 'https://localhost/checkout?asaas3ds=1',
})

const { data: payment } = await admin
  .from('payments')
  .select('id, status, provider_payment_id, method, metadata')
  .eq('order_id', ORDER_ID)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()

const { data: order } = await admin
  .from('orders')
  .select('id, status')
  .eq('id', ORDER_ID)
  .maybeSingle()

const approved =
  res.status < 300 &&
  (json.orderApproved === true ||
    json.status === 'confirmed' ||
    json.providerStatus === 'CONFIRMED' ||
    json.providerStatus === 'RECEIVED')

const declined =
  MODE === 'decline' &&
  (res.status >= 400 ||
    json.error === 'asaas_card_declined_or_invalid' ||
    String(json.error || '').includes('declin') ||
    String(json.providerStatus || '').includes('REFUSED'))

const ok = MODE === 'approve' ? approved : declined || res.status >= 400

console.log(
  JSON.stringify(
    {
      ok,
      mode: MODE,
      cardBrandHint: card.brand,
      httpStatus: res.status,
      latencyMs: ms,
      response: {
        error: json.error ?? null,
        detail:
          typeof json.detail === 'string'
            ? json.detail.slice(0, 180)
            : json.detail
              ? 'object'
              : null,
        status: json.status ?? null,
        providerStatus: json.providerStatus ?? null,
        orderApproved: json.orderApproved ?? null,
        hasThreeDS: Boolean(json.threeDSecureChallengeUrl),
        hasPaymentUrl: Boolean(json.paymentUrl),
        paymentId: json.paymentId ?? null,
        providerPaymentId: json.providerPaymentId ?? null,
        confirmPending: json.confirmPending ?? null,
      },
      orderStatus: order?.status ?? null,
      latestPayment: payment
        ? {
            id: payment.id,
            status: payment.status,
            method: payment.method,
            hasProviderPaymentId: Boolean(payment.provider_payment_id),
            chargePhase: payment.metadata?.charge_phase ?? null,
          }
        : null,
      note:
        'Cartões oficiais Asaas são de sandbox; em produção o esperado é recusa/erro tipado.',
    },
    null,
    2,
  ),
)

process.exit(ok ? 0 : 1)
