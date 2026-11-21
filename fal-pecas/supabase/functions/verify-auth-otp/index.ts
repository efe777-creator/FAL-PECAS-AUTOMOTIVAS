/**
 * FAL — verify-auth-otp
 * Valida código WhatsApp e conclui account_verify ou password_reset.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import {
  type AuthOtpPurpose,
  hashOtpCode,
  isWhatsAppE164,
  toPhoneE164,
} from '../_shared/authOtpCore.ts'

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

const BAD = { ok: false, error: 'invalid_code', message: 'Código inválido ou expirado.' }

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
      code?: string
    }
    const purpose = body.purpose as AuthOtpPurpose
    const code = String(body.code ?? '').replace(/\D/g, '')
    if ((purpose !== 'account_verify' && purpose !== 'password_reset') || code.length !== 6) {
      return json(400, BAD)
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
    } else {
      phoneE164 = toPhoneE164(String(body.phone ?? ''))
    }

    if (!phoneE164 || !isWhatsAppE164(phoneE164)) {
      return json(400, BAD)
    }

    const { data: challenge } = await admin
      .from('auth_otp_challenges')
      .select('id, user_id, code_hash, expires_at, attempts, max_attempts, consumed_at')
      .eq('phone_e164', phoneE164)
      .eq('purpose', purpose)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!challenge) {
      return json(400, BAD)
    }
    if (challenge.consumed_at) {
      return json(400, BAD)
    }
    if (Date.parse(String(challenge.expires_at)) < Date.now()) {
      return json(400, BAD)
    }
    if (Number(challenge.attempts) >= Number(challenge.max_attempts)) {
      return json(400, BAD)
    }

    const expected = String(challenge.code_hash)
    const got = await hashOtpCode(code, pepper)
    if (got !== expected) {
      await admin
        .from('auth_otp_challenges')
        .update({ attempts: Number(challenge.attempts) + 1 })
        .eq('id', challenge.id)
      return json(400, BAD)
    }

    await admin
      .from('auth_otp_challenges')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', challenge.id)

    const uid = (challenge.user_id as string | null) ?? userId
    if (!uid) {
      return json(400, BAD)
    }

    if (purpose === 'account_verify') {
      const { error: markErr } = await admin.rpc('mark_account_verified_from_phone', {
        p_user_id: uid,
      })
      if (markErr) {
        // Fallback direto
        await admin
          .from('profiles')
          .update({
            phone_verified_at: new Date().toISOString(),
            account_verified_at: new Date().toISOString(),
          })
          .eq('id', uid)
      }
      return json(200, { ok: true, purpose: 'account_verify' })
    }

    const { data: userWrap } = await admin.auth.admin.getUserById(uid)
    const email = userWrap.user?.email ?? ''
    if (!email) {
      return json(500, { error: 'recovery_failed', message: 'Conta sem e-mail para redefinir senha.' })
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })
    if (linkErr || !linkData) {
      console.error('[verify-auth-otp] generateLink', linkErr?.message)
      return json(500, { error: 'recovery_failed', message: 'Não foi possível abrir a redefinição.' })
    }

    const props = (linkData as { properties?: { action_link?: string; hashed_token?: string } })
      .properties
    const actionLink = props?.action_link ?? (linkData as { action_link?: string }).action_link ?? null
    const hashed = props?.hashed_token ?? null

    return json(200, {
      ok: true,
      purpose: 'password_reset',
      email,
      hashedToken: hashed,
      actionLink,
    })
  } catch (err) {
    console.error('[verify-auth-otp]', err)
    return json(500, { error: 'internal' })
  }
})
