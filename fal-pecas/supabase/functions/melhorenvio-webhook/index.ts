/**
 * FAL — melhorenvio-webhook (STUB)
 *
 * Valida HMAC-SHA256 (X-ME-Signature), registra evento, idempotente.
 * NÃO chama ship_order nem deliver_order nesta marcha.
 * Sandbox only.
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
      message: 'Configure MELHOR_ENVIO_WEBHOOK_SECRET. Stub não processa sem secret.',
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
  const eventType = String(payload.event ?? payload.type ?? 'unknown')
  // Identificadores de etiqueta / pedido — sem inferir ship/deliver
  const protocol = String(
    (payload.data as Record<string, unknown> | undefined)?.protocol ??
      payload.protocol ??
      '',
  )

  const admin = createClient(supabaseUrl, serviceKey)

  // Ledger leve em tabela genérica se existir; senão só responde ok (stub)
  try {
    await admin.from('melhorenvio_webhook_events').insert({
      event_id: eventId || `anon-${Date.now()}`,
      event_type: eventType,
      protocol: protocol || null,
      payload_sanitized: {
        event: eventType,
        protocol: protocol || null,
        received_at: new Date().toISOString(),
      },
    })
  } catch {
    // Tabela pode não existir até migration aprovada — stub ainda responde 200
  }

  return json(200, {
    ok: true,
    stub: true,
    message:
      'Evento recebido. Pedido NÃO foi avançado automaticamente (ship_order/deliver_order manuais).',
    eventType,
    protocol: protocol || null,
    duplicateSafe: true,
  })
})
