/**
 * Status operacional MP para admin (sem ler secrets).
 * Flags apenas — valores sensíveis ficam no Edge.
 */

export type MpPublicKeyKind = 'test' | 'production' | 'unknown' | 'missing' | 'invalid'

/** UUID após prefixo — formato típico de Public Key (não Access Token longo). */
const MP_PK_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Classifica VITE_MP_PUBLIC_KEY.
 * Public Key: TEST-{uuid} | APP-{uuid} | APP_USR-{uuid} (prod em apps recentes).
 * Access Token longo (APP_USR-… com user id) NÃO deve ir no front → invalid.
 */
export function classifyMpPublicKey(
  raw: string | undefined = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined,
): { kind: MpPublicKeyKind; configured: boolean; suffix: string | null } {
  const key = (raw ?? '').trim().replace(/^=+/, '')
  if (!key) return { kind: 'missing', configured: false, suffix: null }
  const suffix = key.length > 6 ? `…${key.slice(-4)}` : null
  if (key.startsWith('TEST-')) {
    const rest = key.slice('TEST-'.length)
    if (MP_PK_UUID.test(rest) || rest.length > 0) {
      return { kind: 'test', configured: true, suffix }
    }
  }
  if (key.startsWith('APP-') && !key.startsWith('APP_')) {
    return { kind: 'production', configured: true, suffix }
  }
  if (key.startsWith('APP_USR-')) {
    const rest = key.slice('APP_USR-'.length)
    if (MP_PK_UUID.test(rest)) {
      return { kind: 'production', configured: true, suffix }
    }
    // Access Token (ex.: APP_USR-1234-…-userid) — nunca no Vite
    return { kind: 'invalid', configured: false, suffix }
  }
  if (key.startsWith('APP_')) {
    return { kind: 'unknown', configured: true, suffix }
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
  if (kind === 'production') return 'produção (Public Key APP-/APP_USR-uuid)'
  if (kind === 'missing') return 'não configurado'
  if (kind === 'invalid') return 'inválida — parece Access Token (não use no front)'
  return 'indeterminado — confira o prefixo da Public Key'
}

/** True quando o Brick pode inicializar com a chave. */
export function isUsableMpPublicKey(
  raw: string | undefined = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined,
): boolean {
  const { kind, configured } = classifyMpPublicKey(raw)
  return configured && (kind === 'test' || kind === 'production')
}
