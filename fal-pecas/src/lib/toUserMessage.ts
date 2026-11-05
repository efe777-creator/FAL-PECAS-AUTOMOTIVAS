/**
 * Converte erros (Supabase, Error, string, unknown) em mensagem amigável em PT-BR.
 * Nunca retorna "[object Object]".
 */
const SUPABASE_PT: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'User already registered': 'Este e-mail já está cadastrado. Faça login ou recupere a senha.',
  'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
  'Unable to validate email address: invalid format': 'Informe um e-mail válido.',
  'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  'For security purposes, you can only request this after':
    'Por segurança, aguarde um pouco antes de solicitar de novo.',
  'New password should be different from the old password.':
    'A nova senha deve ser diferente da senha atual.',
  'Auth session missing!': 'Sessão expirada. Faça login novamente.',
}

export function toUserMessage(err: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (err == null) return fallback
  if (typeof err === 'string') {
    const t = err.trim()
    if (!t || t === '[object Object]') return fallback
    return SUPABASE_PT[t] ?? t
  }
  if (err instanceof Error) {
    const msg = err.message?.trim()
    if (!msg || msg === '[object Object]') return fallback
    for (const [en, pt] of Object.entries(SUPABASE_PT)) {
      if (msg.includes(en)) return pt
    }
    return SUPABASE_PT[msg] ?? msg
  }
  if (typeof err === 'object') {
    const o = err as { message?: unknown; error_description?: unknown; msg?: unknown }
    const raw = o.message ?? o.error_description ?? o.msg
    if (typeof raw === 'string' && raw.trim() && raw !== '[object Object]') {
      return toUserMessage(raw, fallback)
    }
  }
  return fallback
}
