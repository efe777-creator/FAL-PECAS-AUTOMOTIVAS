/**
 * Status operacional MP para admin (sem ler secrets).
 * Flags apenas — valores sensíveis ficam no Edge.
 */

export type MpPublicKeyKind = 'test' | 'production' | 'unknown' | 'missing'

export function classifyMpPublicKey(
  raw: string | undefined = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined,
): { kind: MpPublicKeyKind; configured: boolean; suffix: string | null } {
  const key = (raw ?? '').trim()
  if (!key) return { kind: 'missing', configured: false, suffix: null }
  const suffix = key.length > 6 ? `…${key.slice(-4)}` : null
  if (key.startsWith('TEST-') || key.startsWith('TEST')) {
    return { kind: 'test', configured: true, suffix }
  }
  if (key.startsWith('APP-') || key.startsWith('APP_')) {
    return { kind: 'production', configured: true, suffix }
  }
  return { kind: 'unknown', configured: true, suffix }
}

export function mpWebhookUrlHint(
  supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL as string | undefined,
): string | null {
  const base = (supabaseUrl ?? '').trim().replace(/\/$/, '')
  if (!base) return null
  return `${base}/functions/v1/mercado-pago-webhook`
}

export function mpEnvLabel(kind: MpPublicKeyKind): string {
  if (kind === 'test') return 'teste (Public Key TEST-)'
  if (kind === 'production') return 'produção (Public Key APP-)'
  if (kind === 'missing') return 'não configurado'
  return 'indeterminado — confira o prefixo da Public Key'
}
