import { LEGAL_VERSIONS } from '@/lib/legalVersions'
import { normalizeUsername } from '@/lib/accountUsername'
import { normalizePhone } from '@/lib/phone'
import { getSupabase, isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'
import type { Session, User } from '@supabase/supabase-js'

export class AuthNotConfiguredError extends Error {
  constructor() {
    super(
      'Login temporariamente indisponível. Tente novamente mais tarde ou fale com o suporte da loja.',
    )
    this.name = 'AuthNotConfiguredError'
  }
}

export function mapUser(user: User | null): UserProfile | null {
  if (!user) return null
  return {
    id: user.id,
    email: user.email ?? null,
    username: (user.user_metadata?.username as string | undefined) ?? null,
    fullName:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    phone: (user.user_metadata?.phone as string | undefined) ?? null,
    role: 'customer',
    emailConfirmed: Boolean(user.email_confirmed_at),
  }
}

const INVALID_CREDENTIALS_MSG = 'E-mail/usuário ou senha incorretos.'

/**
 * Resolve e-mail a partir de e-mail ou username via RPC SECURITY DEFINER
 * (sem lookup direto de profiles no client).
 */
export async function resolveLoginEmail(identifier: string): Promise<string | null> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()
  const trimmed = identifier.trim()
  if (!trimmed) return null
  if (trimmed.includes('@')) return trimmed.toLowerCase()

  const { data, error } = await getSupabase().rpc('resolve_login_identifier', {
    p_identifier: trimmed,
  })
  if (error) throw error
  return typeof data === 'string' && data.length > 0 ? data : null
}

/**
 * Login: e-mail ou usuário + senha via Supabase Auth.
 * Username é resolvido por RPC (não no frontend).
 */
export async function signInWithIdentifier(params: {
  emailOrUsername: string
  password: string
}): Promise<{ session: Session | null; user: UserProfile | null }> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()

  const identifier = params.emailOrUsername.trim()
  const email = await resolveLoginEmail(identifier)
  if (!email) {
    throw new Error(INVALID_CREDENTIALS_MSG)
  }

  const { data, error } = await getSupabase().auth.signInWithPassword({
    email,
    password: params.password,
  })
  if (error) {
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('invalid') || msg.includes('credentials')) {
      throw new Error(INVALID_CREDENTIALS_MSG)
    }
    throw error
  }
  return { session: data.session, user: mapUser(data.user) }
}

export async function signUp(params: {
  email: string
  password: string
  firstName: string
  lastName: string
  username?: string
  phone?: string
  cpf?: string
}): Promise<{ session: Session | null; user: UserProfile | null }> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()

  const fullName = `${params.firstName} ${params.lastName}`.trim()
  const phone = params.phone?.trim() ? normalizePhone(params.phone) : null
  const cpf = params.cpf?.replace(/\D/g, '') || null
  const username = params.username?.trim()
    ? normalizeUsername(params.username)
    : null
  const { data, error } = await getSupabase().auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: {
      emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/login`,
      data: {
        full_name: fullName,
        first_name: params.firstName,
        last_name: params.lastName,
        username,
        phone,
        cpf,
        terms_version: LEGAL_VERSIONS.terms,
        commercial_version: LEGAL_VERSIONS.commercial,
        privacy_version: LEGAL_VERSIONS.privacy,
        returns_version: LEGAL_VERSIONS.returns,
        terms_accepted_at: new Date().toISOString(),
      },
    },
  })
  if (error) throw error

  // CPF também vai no metadata; handle_new_user grava em customers.
  // Se já houver sessão (confirm e-mail desligado), reforça o update.
  if (data.session?.user && cpf) {
    await getSupabase()
      .from('customers')
      .update({ cpf })
      .eq('profile_id', data.session.user.id)
  }

  return { session: data.session, user: mapUser(data.user) }
}

/** Se o customer ainda não tem CPF, copia do user_metadata do Auth (cadastro com confirm). */
export async function syncCustomerCpfFromMetadata(user: User): Promise<void> {
  if (!isSupabaseConfigured) return
  const metaCpf = String(user.user_metadata?.cpf ?? '').replace(/\D/g, '')
  if (!metaCpf || metaCpf.length !== 11) return
  const sb = getSupabase()
  const { data: customer } = await sb
    .from('customers')
    .select('id, cpf')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!customer || customer.cpf) return
  const { error } = await sb.from('customers').update({ cpf: metaCpf }).eq('id', customer.id)
  if (error) console.warn('[FAL] sync CPF metadata', error.message)
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await getSupabase().auth.signOut()
  if (error) throw error
}

export async function resetPassword(email: string): Promise<void> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()
  const redirectTo = `${window.location.origin}/redefinir-senha`
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  })
  if (error) throw error
}

export async function updatePassword(newPassword: string): Promise<void> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()
  const { error } = await getSupabase().auth.updateUser({ password: newPassword })
  if (error) throw error
}

async function reauthenticateWithPassword(currentPassword: string): Promise<string> {
  const sb = getSupabase()
  const { data: auth, error: userErr } = await sb.auth.getUser()
  if (userErr) throw userErr
  const email = auth.user?.email
  if (!email) throw new Error('Sessão sem e-mail. Entre novamente.')

  const { error } = await sb.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (error) throw new Error('Senha atual incorreta.')
  return email
}

/** Altera senha exigindo a senha atual (anti-hijack de sessão). */
export async function changePassword(params: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()
  await reauthenticateWithPassword(params.currentPassword)
  await updatePassword(params.newPassword)
}

/**
 * Solicita troca de e-mail. Supabase envia confirmação ao novo endereço;
 * o e-mail atual permanece ativo até confirmar.
 */
export async function updateEmail(params: {
  newEmail: string
  currentPassword: string
}): Promise<void> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()
  const newEmail = params.newEmail.trim().toLowerCase()
  if (!newEmail.includes('@')) throw new Error('Informe um e-mail válido.')

  await reauthenticateWithPassword(params.currentPassword)

  const redirectTo = `${window.location.origin}/conta/perfil`
  const { error } = await getSupabase().auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: redirectTo },
  )
  if (error) throw error
}

export async function resendSignupConfirmation(email: string): Promise<void> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()
  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email: email.trim(),
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
    },
  })
  if (error) throw error
}

export type AuthOtpPurpose = 'account_verify' | 'password_reset'

export type SendAuthOtpResult = {
  ok: boolean
  message?: string
  expiresInSec?: number
  /** Só quando Edge WHATSAPP_OTP_PROVIDER=mock */
  debugCode?: string
}

export type VerifyAuthOtpResult = {
  ok: boolean
  purpose?: AuthOtpPurpose
  email?: string | null
  hashedToken?: string | null
  actionLink?: string | null
  message?: string
}

function otpInvokeError(data: unknown, fallback: string): Error {
  const body = data as { message?: string; error?: string } | null
  const code = body?.error
  if (code === 'cooldown' || code === 'rate_limited') {
    return new Error(body?.message || 'Aguarde um momento antes de pedir outro código.')
  }
  return new Error(body?.message || body?.error || fallback)
}

/** Envia OTP WhatsApp via Edge `send-auth-otp`. */
export async function sendAuthOtp(params: {
  purpose: AuthOtpPurpose
  phone?: string
}): Promise<SendAuthOtpResult> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()
  const { data, error } = await getSupabase().functions.invoke('send-auth-otp', {
    body: {
      purpose: params.purpose,
      phone: params.phone,
    },
  })
  const body = data as (SendAuthOtpResult & { error?: string }) | null
  if (body?.ok) return body
  if (body?.error || body?.message) {
    throw otpInvokeError(body, 'Não foi possível enviar o código')
  }
  if (error) throw error
  throw new Error('Não foi possível enviar o código')
}

/**
 * Valida OTP. Em password_reset, estabelece sessão recovery via token_hash
 * quando a Edge devolver hashedToken.
 */
export async function verifyAuthOtp(params: {
  purpose: AuthOtpPurpose
  code: string
  phone?: string
}): Promise<VerifyAuthOtpResult> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()
  const { data, error } = await getSupabase().functions.invoke('verify-auth-otp', {
    body: {
      purpose: params.purpose,
      code: params.code,
      phone: params.phone,
    },
  })
  const body = data as (VerifyAuthOtpResult & { error?: string }) | null
  if (!body?.ok) {
    if (body?.error || body?.message) {
      throw otpInvokeError(body, 'Código inválido ou expirado.')
    }
    if (error) throw error
    throw new Error('Código inválido ou expirado.')
  }

  if (params.purpose === 'password_reset' && body.hashedToken) {
    const { error: otpErr } = await getSupabase().auth.verifyOtp({
      type: 'recovery',
      token_hash: body.hashedToken,
    })
    if (otpErr) throw otpErr
  }

  return body
}

/** Marca account_verified_at quando o e-mail Auth já está confirmado. */
export async function syncAccountVerifiedFromAuth(): Promise<void> {
  if (!isSupabaseConfigured) return
  const sb = getSupabase()
  const { error: rpcErr } = await sb.rpc('mark_account_verified_from_email')
  if (!rpcErr) return

  // Migration ausente / schema antigo: não spammar console em loop de enrich.
  const rpcMsg = (rpcErr.message || '').toLowerCase()
  if (
    rpcMsg.includes('could not find') ||
    rpcMsg.includes('does not exist') ||
    rpcMsg.includes('schema cache')
  ) {
    return
  }

  // Fallback se a RPC falhou por outro motivo mas a coluna já existe
  const { data: auth } = await sb.auth.getUser()
  const user = auth.user
  if (!user?.email_confirmed_at) return
  const { error } = await sb
    .from('profiles')
    .update({ account_verified_at: user.email_confirmed_at })
    .eq('id', user.id)
    .is('account_verified_at', null)
  if (error) {
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('account_verified_at') || msg.includes('schema cache')) return
    console.warn('[FAL] sync account_verified_at', error.message)
  }
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export function onAuthStateChange(
  callback: (session: Session | null) => void,
): () => void {
  if (!supabase) {
    callback(null)
    return () => undefined
  }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => data.subscription.unsubscribe()
}
