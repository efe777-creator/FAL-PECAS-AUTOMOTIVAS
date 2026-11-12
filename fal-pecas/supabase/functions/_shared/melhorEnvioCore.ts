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
  /** Anti-dupla compra sob timeout de checkout. */
  purchase_in_flight?: boolean | null
  divergence?: {
    chargedShipping: number
    labelAmount: number
    delta: number
    blocked: boolean
    reason?: string
  } | null
  divergence_override?: {
    reason: string
    at?: string
    by?: string
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

function onlyDigits(v: string): string {
  return v.replace(/\D/g, '')
}

function mod11Check(digits: number[], weights: number[]): number {
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i]!, 0)
  const mod = sum % 11
  return mod < 2 ? 0 : 11 - mod
}

/** CPF matematicamente válido (não prova existência na Receita). */
export function isValidCpf(raw: string): boolean {
  const cpf = onlyDigits(raw)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const nums = cpf.split('').map((c) => Number(c))
  const d1 = mod11Check(nums.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  if (d1 !== nums[9]) return false
  const d2 = mod11Check(nums.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return d2 === nums[10]
}

/** CNPJ matematicamente válido. */
export function isValidCnpj(raw: string): boolean {
  const cnpj = onlyDigits(raw)
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false
  const nums = cnpj.split('').map((c) => Number(c))
  const d1 = mod11Check(nums.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  if (d1 !== nums[12]) return false
  const d2 = mod11Check(nums.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return d2 === nums[13]
}

/** Fallbacks distintos — ME rejeita CPF remetente == destinatário. */
export const ME_FALLBACK_FROM_CPF = '39053344705'
export const ME_FALLBACK_TO_CPF = '52998224725'

/**
 * Campos de documento ME para remetente.
 * CNPJ inválido na origem → envia CPF (envio não comercial) em vez de company_document.
 */
export function meFromDocumentFields(rawDocument: string | null | undefined): Record<string, string> {
  const doc = onlyDigits(String(rawDocument ?? ''))
  if (doc.length === 14 && isValidCnpj(doc)) return { company_document: doc }
  if (doc.length === 11 && isValidCpf(doc)) return { document: doc }
  return { document: ME_FALLBACK_FROM_CPF }
}

export function meToDocument(rawDocument: string | null | undefined): string {
  const doc = onlyDigits(String(rawDocument ?? ''))
  if (doc.length === 11 && isValidCpf(doc) && doc !== ME_FALLBACK_FROM_CPF) return doc
  if (doc.length === 14 && isValidCnpj(doc)) return doc
  return ME_FALLBACK_TO_CPF
}
