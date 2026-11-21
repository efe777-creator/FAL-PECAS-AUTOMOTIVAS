import { getSupabase } from '@/lib/supabase'
import { onlyDigits } from '@/lib/document'
import { normalizePhone } from '@/lib/phone'
import type { UserProfile } from '@/types'

export async function getCustomerProfile(userId: string): Promise<{
  profile: Pick<
    UserProfile,
    | 'id'
    | 'fullName'
    | 'phone'
    | 'username'
    | 'role'
    | 'customerId'
    | 'cpf'
    | 'cnpj'
    | 'accountVerifiedAt'
    | 'phoneVerifiedAt'
    | 'verificationGraceEndsAt'
  >
}> {
  const sb = getSupabase()
  const customerPromise = sb
    .from('customers')
    .select('id, cpf, cnpj')
    .eq('profile_id', userId)
    .maybeSingle()

  let profile: Record<string, unknown> | null = null
  let pErr: { message?: string; code?: string } | null = null

  {
    const full = await sb
      .from('profiles')
      .select(
        'id, full_name, phone, username, role, account_verified_at, phone_verified_at, verification_grace_ends_at',
      )
      .eq('id', userId)
      .maybeSingle()
    if (full.error && /account_verified_at|verification_grace|phone_verified/i.test(full.error.message)) {
      const legacy = await sb
        .from('profiles')
        .select('id, full_name, phone, username, role')
        .eq('id', userId)
        .maybeSingle()
      profile = (legacy.data as Record<string, unknown> | null) ?? null
      pErr = legacy.error
    } else {
      profile = (full.data as Record<string, unknown> | null) ?? null
      pErr = full.error
    }
  }

  const { data: customer, error: cErr } = await customerPromise
  if (pErr) throw pErr
  if (cErr) throw cErr
  if (!profile) throw new Error('Perfil não encontrado')

  return {
    profile: {
      id: String(profile.id),
      fullName: (profile.full_name as string | null) ?? null,
      phone: (profile.phone as string | null) ?? null,
      username: (profile.username as string | null) ?? null,
      role: profile.role as UserProfile['role'],
      customerId: customer ? String(customer.id) : null,
      cpf: (customer?.cpf as string | null) ?? null,
      cnpj: (customer?.cnpj as string | null) ?? null,
      accountVerifiedAt: (profile.account_verified_at as string | null) ?? null,
      phoneVerifiedAt: (profile.phone_verified_at as string | null) ?? null,
      verificationGraceEndsAt: (profile.verification_grace_ends_at as string | null) ?? null,
    },
  }
}

export async function updateCustomerProfile(input: {
  userId: string
  fullName: string
  phone?: string | null
  username?: string | null
  cpf?: string | null
  cnpj?: string | null
}): Promise<void> {
  const sb = getSupabase()
  const cpf = input.cpf?.trim() ? onlyDigits(input.cpf) : null
  const cnpj = input.cnpj?.trim() ? onlyDigits(input.cnpj) : null

  const phone = input.phone?.trim() ? normalizePhone(input.phone) : null
  const usernameRaw = input.username?.trim() ?? ''
  const username = usernameRaw.length > 0 ? usernameRaw.toLowerCase() : null

  const { data: prevProfile } = await sb
    .from('profiles')
    .select('phone')
    .eq('id', input.userId)
    .maybeSingle()
  const prevPhone = prevProfile?.phone ? normalizePhone(String(prevProfile.phone)) : ''
  const nextPhone = phone || ''
  const phoneChanged = prevPhone !== nextPhone

  // Nunca enviar role. Troca de WhatsApp invalida verificação do telefone.
  const { error: pErr } = await sb
    .from('profiles')
    .update({
      full_name: input.fullName.trim(),
      phone: phone || null,
      username,
      ...(phoneChanged ? { phone_verified_at: null } : {}),
    })
    .eq('id', input.userId)
  if (pErr) {
    const msg = (pErr.message || '').toLowerCase()
    if (msg.includes('duplicate') || msg.includes('unique') || pErr.code === '23505') {
      throw new Error('Este nome de usuário já está em uso. Escolha outro.')
    }
    throw pErr
  }

  const { data: customer, error: findErr } = await sb
    .from('customers')
    .select('id')
    .eq('profile_id', input.userId)
    .maybeSingle()
  if (findErr) throw findErr

  if (!customer) {
    const { error: insErr } = await sb.from('customers').insert({
      profile_id: input.userId,
      cpf,
      cnpj,
    })
    if (insErr) throw insErr
    return
  }

  const { error: cErr } = await sb
    .from('customers')
    .update({ cpf, cnpj })
    .eq('id', customer.id)
  if (cErr) throw cErr
}

export async function getCurrentCustomerId(): Promise<string | null> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return null
  const { data, error } = await sb.from('customers').select('id').eq('profile_id', uid).maybeSingle()
  if (error) throw error
  return data ? String(data.id) : null
}
