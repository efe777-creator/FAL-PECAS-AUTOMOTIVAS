/**
 * FAL — send-auth-otp
 * Envia código 6 dígitos via WhatsApp (account_verify | password_reset).
 */
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import {
  type AuthOtpPurpose,
  generateOtpCode,
  hashOtpCode,
  isWhatsAppE164,
  OTP_MAX_PER_HOUR,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  otpMessage,
  toPhoneE164,
} from '../_shared/authOtpCore.ts'
import { createWhatsAppOtpProvider } from '../_shared/whatsappOtpProvider.ts'

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

const UNIFORM_OK = {
  ok: true,
  message: 'Se o número estiver cadastrado, você receberá um código em breve.',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const pepper = (Deno.env.get('OTP_PEPPER') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'fal-otp').slice(0, 64)

    if (!supabaseUrl || !serviceKey) {
      return json(500, { error: 'server_misconfigured' })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const body = (await req.json().catch(() => ({}))) as {
      purpose?: string
      phone?: string
    }
    const purpose = body.purpose as AuthOtpPurpose
    if (purpose !== 'account_verify' && purpose !== 'password_reset') {
      return json(400, { error: 'invalid_purpose' })
    }

    let userId: string | null = null
    let phoneE164: string | null = null

    if (purpose === 'account_verify') {
      const authHeader = req.headers.get('Authorization') ?? ''
      if (!authHeader.startsWith('Bearer ')) {
        return json(401, { error: 'unauthorized' })
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: auth, error: authErr } = await userClient.auth.getUser()
      if (authErr || !auth.user) {
        return json(401, { error: 'unauthorized' })
      }
      userId = auth.user.id
      const { data: profile } = await admin
        .from('profiles')
        .select('phone')
        .eq('id', userId)
        .maybeSingle()
      phoneE164 = toPhoneE164(String(profile?.phone ?? ''))
      if (!phoneE164 || !isWhatsAppE164(phoneE164)) {
        return json(400, {
          error: 'invalid_phone',
          message: 'Cadastre um celular WhatsApp válido no perfil.',
        })
      }
    } else {
      phoneE164 = toPhoneE164(String(body.phone ?? ''))
      if (!phoneE164 || !isWhatsAppE164(phoneE164)) {
        // Uniforme: não revelar formato demais no reset
        return json(200, UNIFORM_OK)
      }
      // Match profiles.phone (só dígitos BR sem 55 ou com).
      // Telefone compartilhado: preferir perfil mais recentemente atualizado.
      const national = phoneE164.replace(/^55/, '')
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, phone, updated_at')
        .or(`phone.eq.${national},phone.eq.${phoneE164},phone.eq.55${national}`)
        .order('updated_at', { ascending: false })
        .limit(10)
      const matches = (profiles ?? []).filter((p) => {
        const e = toPhoneE164(String(p.phone ?? ''))
        return e === phoneE164
      })
      if (matches.length === 0) {
        return json(200, UNIFORM_OK)
      }
      if (matches.length > 1) {
        console.warn(
          `[send-auth-otp] phone compartilhado n=${matches.length} — usando updated_at mais recente`,
        )
      }
      userId = String(matches[0]!.id)
    }

    // Rate limit: cooldown + max/hora
    const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: hourCount } = await admin
      .from('auth_otp_challenges')
      .select('id', { count: 'exact', head: true })
      .eq('phone_e164', phoneE164!)
      .eq('purpose', purpose)
      .gte('created_at', sinceHour)

    if ((hourCount ?? 0) >= OTP_MAX_PER_HOUR) {
      if (purpose === 'password_reset') return json(200, UNIFORM_OK)
      return json(429, { error: 'rate_limited', message: 'Muitas tentativas. Aguarde e tente de novo.' })
    }

    const { data: latest } = await admin
      .from('auth_otp_challenges')
      .select('created_at')
      .eq('phone_e164', phoneE164!)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latest?.created_at) {
      const age = Date.now() - Date.parse(String(latest.created_at))
      if (age < OTP_RESEND_COOLDOWN_MS) {
        if (purpose === 'password_reset') return json(200, UNIFORM_OK)
        return json(429, {
          error: 'cooldown',
          message: 'Aguarde cerca de 1 minuto antes de pedir outro código.',
        })
      }
    }

    const code = generateOtpCode()
    const codeHash = await hashOtpCode(code, pepper)
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()

    const { error: insErr } = await admin.from('auth_otp_challenges').insert({
      user_id: userId,
      phone_e164: phoneE164,
      purpose,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: 5,
    })
    if (insErr) {
      console.error('[send-auth-otp] insert', insErr.message)
      return json(500, { error: 'persist_failed' })
    }

    const providerMode = (Deno.env.get('WHATSAPP_OTP_PROVIDER') ?? 'mock').toLowerCase().trim()
    try {
      const provider = createWhatsAppOtpProvider()
      await provider.sendText(phoneE164!, otpMessage(code, purpose))
    } catch (err) {
      console.error('[send-auth-otp] send', err)
      if (purpose === 'password_reset') return json(200, UNIFORM_OK)
      return json(502, { error: 'send_failed', message: 'Não foi possível enviar o WhatsApp agora.' })
    }

    // Só mock: devolve debugCode para smoke local (nunca em zapi).
    const debugCode = providerMode === 'mock' ? code : undefined

    if (purpose === 'password_reset') {
      return json(200, { ...UNIFORM_OK, ...(debugCode ? { debugCode } : {}) })
    }
    return json(200, {
      ok: true,
      message: 'Código enviado no WhatsApp.',
      expiresInSec: Math.floor(OTP_TTL_MS / 1000),
      ...(debugCode ? { debugCode } : {}),
    })
  } catch (err) {
    console.error('[send-auth-otp]', err)
    return json(500, { error: 'internal' })
  }
})
