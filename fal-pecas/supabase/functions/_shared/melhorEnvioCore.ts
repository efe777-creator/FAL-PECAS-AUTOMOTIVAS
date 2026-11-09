/** Melhor Envio helpers — sem tokens no frontend. */

export const ME_SANDBOX_BASE = 'https://sandbox.melhorenvio.com.br'
export const ME_PROD_BASE = 'https://melhorenvio.com.br'

/** Override via secret `MELHOR_ENVIO_API_BASE` (token deve casar com o ambiente). Default = sandbox. */
export function meApiBase(): string {
  const raw = (typeof Deno !== 'undefined' ? Deno.env.get('MELHOR_ENVIO_API_BASE') : null) ?? ''
  const trimmed = raw.trim().replace(/\/$/, '')
  if (trimmed) return trimmed
  return ME_SANDBOX_BASE
}

/** live = API produção ME; sandbox = default ou base com sandbox. */
export function meRuntimeMode(base?: string): 'live' | 'sandbox' {
  const b = (base ?? meApiBase()).replace(/\/$/, '').toLowerCase()
  if (b === ME_PROD_BASE.toLowerCase() || b === 'https://www.melhorenvio.com.br') return 'live'
  if (b.includes('sandbox')) return 'sandbox'
  // Base custom explícita sem "sandbox" → tratar como live (token deve casar).
  const raw = (typeof Deno !== 'undefined' ? Deno.env.get('MELHOR_ENVIO_API_BASE') : null) ?? ''
  if (raw.trim() && !b.includes('sandbox')) return 'live'
  return 'sandbox'
}

export function meIsProduction(base?: string): boolean {
  return meRuntimeMode(base) === 'live'
}

export type MeLabelState =
  | 'none'
  | 'quoted'
  | 'prepared'
  | 'cart'
  | 'purchased'
  | 'generated'
  | 'printed'

export type MeMeta = {
  label_state?: MeLabelState
  cart_item_id?: string | null
  protocol?: string | null
  tracking?: string | null
  label_url?: string | null
  service_id?: string | number | null
  label_amount?: number | null
  quoted_amount?: number | null
  volumes?: unknown
  last_error?: string | null
  checkout_snapshot_ref?: string | null
  dry_run?: boolean
  divergence?: {
    chargedShipping: number
    labelAmount: number
    delta: number
    blocked: boolean
    reason?: string
  } | null
}

export function parseMeMeta(metadata: Record<string, unknown> | null | undefined): MeMeta {
  if (!metadata || typeof metadata !== 'object') return {}
  const raw = metadata.me
  if (!raw || typeof raw !== 'object') return {}
  return raw as MeMeta
}

export function mergeMeMeta(
  existing: Record<string, unknown> | null | undefined,
  patch: MeMeta,
): Record<string, unknown> {
  const base = { ...(existing ?? {}) }
  const prev = parseMeMeta(existing)
  base.me = { ...prev, ...patch }
  return base
}

export function labelStateOf(metadata: Record<string, unknown> | null | undefined): MeLabelState {
  const s = parseMeMeta(metadata).label_state
  if (
    s === 'quoted' ||
    s === 'prepared' ||
    s === 'cart' ||
    s === 'purchased' ||
    s === 'generated' ||
    s === 'printed'
  ) {
    return s
  }
  return 'none'
}

export function alreadyPurchased(state: MeLabelState): boolean {
  return state === 'purchased' || state === 'generated' || state === 'printed'
}

export function alreadyGenerated(state: MeLabelState): boolean {
  return state === 'generated' || state === 'printed'
}

export function evaluateFreightDivergence(input: {
  chargedShipping: number
  labelAmount: number
  tolerance?: number
  serviceAvailable?: boolean
}): {
  chargedShipping: number
  labelAmount: number
  delta: number
  blocked: boolean
  reason: string
} {
  const tolerance = input.tolerance ?? 0.01
  if (input.serviceAvailable === false) {
    return {
      chargedShipping: input.chargedShipping,
      labelAmount: input.labelAmount,
      delta: input.labelAmount - input.chargedShipping,
      blocked: true,
      reason: 'Serviço de frete indisponível no Melhor Envio.',
    }
  }
  const delta = Number((input.labelAmount - input.chargedShipping).toFixed(2))
  const blocked = Math.abs(delta) > tolerance
  return {
    chargedShipping: input.chargedShipping,
    labelAmount: input.labelAmount,
    delta,
    blocked,
    reason: blocked
      ? `Valor da etiqueta (${input.labelAmount.toFixed(2)}) difere do frete cobrado (${input.chargedShipping.toFixed(2)}). Compra bloqueada.`
      : 'Valores alinhados.',
  }
}

/** HMAC-SHA256 hex do body — cabeçalho X-ME-Signature (preparação). */
export async function verifyMeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody))
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  const incoming = signatureHeader.replace(/^sha256=/i, '').trim().toLowerCase()
  if (incoming.length !== hex.length) return false
  let ok = true
  for (let i = 0; i < hex.length; i++) {
    if (incoming[i] !== hex[i]) ok = false
  }
  return ok
}

export function meAuthHeaders(token: string, userAgent: string): Record<string, string> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'User-Agent': userAgent,
  }
}
