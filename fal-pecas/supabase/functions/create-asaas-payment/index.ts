// FAL PAY — cobrança Asaas (PIX / boleto / cartão). Hot path compartilhado in-process.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { asaasApiBase } from '../_shared/asaasApiCore.ts'
import { parseAsaasCreateClientBody } from '../_shared/asaasCreatePaymentCore.ts'
import { runAsaasCreateChargeFlow } from '../_shared/asaasCreateChargeFlow.ts'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    const apiKey = Deno.env.get('ASAAS_API_KEY')
    if (!apiKey) return json(503, { error: 'ASAAS_API_KEY missing' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(500, { error: 'supabase_env_missing' })
    }

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

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return json(400, { error: 'invalid_json' })
    }

    const { orderId, method, installments } = parseAsaasCreateClientBody(
      (rawBody ?? {}) as Record<string, unknown>,
    )

    const admin = createClient(supabaseUrl, serviceKey)
    const outcome = await runAsaasCreateChargeFlow({
      admin,
      apiKey,
      asaasBase: asaasApiBase(Deno.env.get('ASAAS_ENV')),
      user: { id: user.id, email: user.email },
      orderId,
      method,
      installments,
      headers: req.headers,
    })
    return json(outcome.httpStatus, outcome.body)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown_error'
    return json(400, { error: message })
  }
})
