/**
 * Smoke autenticado: create-fal-payment cartão Asaas (invoiceUrl).
 * Uso: node scripts/smoke-asaas-card-create.mjs [orderId] [method]
 */
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

const PROJECT_REF = 'wtbpwuiayednvlhvuhbh'
const URL = `https://${PROJECT_REF}.supabase.co`
const ORDER_ID = process.argv[2] || 'b0304f49-b32e-4189-8c0b-e0906ee14573'
const METHOD = process.argv[3] || 'debit_card'
const PROFILE_ID = 'ddb45683-34bf-4596-93c4-4676f423e5d4'

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

const t0 = Date.now()
const res = await fetch(`${URL}/functions/v1/create-fal-payment`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    apikey: anon,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orderId: ORDER_ID,
    method: METHOD,
    installments: 1,
  }),
})
const ms = Date.now() - t0
const body = await res.json().catch(() => ({}))

const { data: payment } = await admin
  .from('payments')
  .select(
    'id, provider, method, status, provider_payment_id, payment_url, amount, metadata',
  )
  .eq('order_id', ORDER_ID)
  .eq('status', 'pending')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()

const ok =
  res.status < 300 &&
  Boolean(body.paymentUrl) &&
  Boolean(body.providerPaymentId || payment?.provider_payment_id) &&
  body.provider === 'asaas'

console.log(
  JSON.stringify(
    {
      ok,
      httpStatus: res.status,
      latencyMs: ms,
      orderId: ORDER_ID,
      method: METHOD,
      response: {
        error: body.error ?? null,
        detail: body.detail ?? null,
        provider: body.provider ?? null,
        routedProvider: body.routedProvider ?? null,
        paymentId: body.paymentId ?? null,
        providerPaymentId: body.providerPaymentId ?? null,
        hasPaymentUrl: Boolean(body.paymentUrl),
        paymentUrlHost: body.paymentUrl
          ? (() => {
              try {
                return new URL(String(body.paymentUrl)).host
              } catch {
                return 'invalid_url'
              }
            })()
          : null,
        reused: body.reused ?? null,
        reconciled: body.reconciled ?? null,
        status: body.status ?? null,
      },
      ledger: payment
        ? {
            id: payment.id,
            provider: payment.provider,
            method: payment.method,
            status: payment.status,
            hasProviderPaymentId: Boolean(payment.provider_payment_id),
            hasPaymentUrl: Boolean(payment.payment_url),
            chargePhase: payment.metadata?.charge_phase ?? null,
            amount: payment.amount,
          }
        : null,
    },
    null,
    2,
  ),
)

process.exit(ok ? 0 : 1)
