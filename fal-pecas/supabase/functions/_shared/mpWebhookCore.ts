/**
 * F9-C — núcleo puro webhook Mercado Pago (testável sem Deno).
 * Manifest: id:{dataId};request-id:{xRequestId};ts:{ts};
 */

export function parseXSignature(header: string | null | undefined): {
  ts: string
  v1: string
} | null {
  if (!header?.trim()) return null
  let ts: string | undefined
  let v1: string | undefined
  for (const part of header.split(',')) {
    const [k, ...rest] = part.split('=')
    const key = k?.trim()
    const value = rest.join('=').trim()
    if (key === 'ts') ts = value
    if (key === 'v1') v1 = value
  }
  if (!ts || !v1) return null
  return { ts, v1 }
}

/** data.id alfanumérico → lowercase (regra MP). */
export function normalizeWebhookDataId(dataId: string): string {
  return /^[a-zA-Z0-9]+$/.test(dataId) ? dataId.toLowerCase() : dataId
}

export function buildWebhookManifest(input: {
  dataId: string
  requestId: string
  ts: string
}): string {
  const id = normalizeWebhookDataId(input.dataId)
  return `id:${id};request-id:${input.requestId};ts:${input.ts};`
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyMpWebhookSignature(input: {
  xSignature: string | null | undefined
  xRequestId: string | null | undefined
  dataId: string | null | undefined
  secret: string | undefined
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!input.secret) return { ok: false, reason: 'MP_WEBHOOK_SECRET missing' }
  if (!input.xRequestId?.trim()) return { ok: false, reason: 'missing_x_request_id' }
  if (!input.dataId?.trim()) return { ok: false, reason: 'missing_data_id' }
  const parsed = parseXSignature(input.xSignature)
  if (!parsed) return { ok: false, reason: 'invalid_x_signature' }
  const manifest = buildWebhookManifest({
    dataId: input.dataId,
    requestId: input.xRequestId,
    ts: parsed.ts,
  })
  const computed = await hmacSha256Hex(input.secret, manifest)
  if (!timingSafeEqualHex(computed, parsed.v1)) {
    return { ok: false, reason: 'signature_mismatch' }
  }
  return { ok: true }
}

export type InternalPaymentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired'

/** Mapeia status MP → status interno FAL (sem auto-approve de order aqui). */
export function mapMpProviderStatusToInternal(
  providerStatus: string | null | undefined,
): InternalPaymentStatus {
  const s = (providerStatus ?? '').toLowerCase()
  if (s === 'approved') return 'approved'
  if (s === 'rejected' || s === 'charged_back') return 'rejected'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'expired') return 'expired'
  return 'pending'
}

export function amountsMatch(orderTotal: number, mpAmount: number, eps = 0.01): boolean {
  return Math.abs(Number(orderTotal) - Number(mpAmount)) <= eps
}

export function extractWebhookDataId(query: URLSearchParams, body: unknown): string | null {
  const fromQuery = query.get('data.id') ?? query.get('id')
  if (fromQuery?.trim()) return fromQuery.trim()
  if (body && typeof body === 'object') {
    const data = (body as { data?: { id?: unknown } }).data
    if (data?.id != null) return String(data.id)
  }
  return null
}

export function extractWebhookEventType(body: unknown): string {
  if (body && typeof body === 'object') {
    const t = (body as { type?: unknown; action?: unknown }).type
    if (typeof t === 'string' && t) return t
    const a = (body as { action?: unknown }).action
    if (typeof a === 'string' && a) return a
  }
  return 'unknown'
}
