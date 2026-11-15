/**
 * Cliente HTTP mínimo Asaas API v3 (Edge only — nunca no browser).
 */

const SANDBOX_BASE = 'https://api-sandbox.asaas.com/v3'
const PRODUCTION_BASE = 'https://api.asaas.com/v3'

export function asaasApiBase(env: string | undefined): string {
  const v = (env ?? 'sandbox').trim().toLowerCase()
  return v === 'production' ? PRODUCTION_BASE : SANDBOX_BASE
}

export async function asaasApiRequest<T = unknown>(
  apiKey: string,
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T; status: number } | { ok: false; status: number; body: unknown }> {
  const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  const method = String(init?.method ?? 'GET').toUpperCase()
  // GET /pixQrCode: Asaas retorna 403 se a chamada tiver body (docs).
  const headers: Record<string, string> = {
    access_token: apiKey,
    'User-Agent': 'FAL-PECAS-AUTOMOTIVAS/1.0',
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(url, {
    ...init,
    method,
    headers,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, status: res.status, body }
  }
  return { ok: true, data: body as T, status: res.status }
}

export type AsaasBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD'

export function asaasBillingTypeForMethod(
  method: 'pix' | 'credit_card' | 'debit_card' | 'boleto',
): AsaasBillingType {
  if (method === 'boleto') return 'BOLETO'
  if (method === 'credit_card' || method === 'debit_card') return 'CREDIT_CARD'
  return 'PIX'
}

export function asaasDueDateDaysFromNow(days = 3): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}