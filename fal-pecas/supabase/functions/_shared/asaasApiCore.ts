/**
 * Cliente HTTP mínimo Asaas API v3 (Edge only — nunca no browser).
 * Timeout explícito: evita wall clock 546 no create.
 */

const SANDBOX_BASE = 'https://api-sandbox.asaas.com/v3'
const PRODUCTION_BASE = 'https://api.asaas.com/v3'

/** Timeout padrão por chamada Asaas (ms). Create + QR cabem; wall clock Edge ~150s. */
export const ASAAS_DEFAULT_TIMEOUT_MS = 20_000

export function asaasApiBase(env: string | undefined): string {
  const v = (env ?? 'sandbox').trim().toLowerCase()
  return v === 'production' ? PRODUCTION_BASE : SANDBOX_BASE
}

export type AsaasApiOk<T> = { ok: true; data: T; status: number }
export type AsaasApiErr = {
  ok: false
  status: number
  body: unknown
  /** Timeout/abort — cobrança pode ter sido criada no Asaas; exige reconcile. */
  inconclusive: boolean
}

export type AsaasApiResult<T = unknown> = AsaasApiOk<T> | AsaasApiErr

export type AsaasApiRequestOptions = RequestInit & {
  /** Override do timeout padrão (ms). */
  timeoutMs?: number
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = String((err as { name?: string }).name ?? '')
  return name === 'AbortError' || name === 'TimeoutError'
}

/**
 * Fetch Asaas com AbortSignal + timeout.
 * Em timeout retorna ok:false + inconclusive:true (nunca throw por abort).
 */
export async function asaasApiRequest<T = unknown>(
  apiKey: string,
  baseUrl: string,
  path: string,
  init?: AsaasApiRequestOptions,
): Promise<AsaasApiResult<T>> {
  const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  const method = String(init?.method ?? 'GET').toUpperCase()
  const timeoutMs = Math.max(
    1_000,
    Math.floor(Number(init?.timeoutMs ?? ASAAS_DEFAULT_TIMEOUT_MS) || ASAAS_DEFAULT_TIMEOUT_MS),
  )

  const headers: Record<string, string> = {
    access_token: apiKey,
    'User-Agent': 'FAL-PECAS-AUTOMOTIVAS/1.0',
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json'
  }

  const controller = new AbortController()
  const outer = init?.signal
  const onOuterAbort = () => controller.abort()
  if (outer) {
    if (outer.aborted) controller.abort()
    else outer.addEventListener('abort', onOuterAbort, { once: true })
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const { timeoutMs: _t, signal: _s, ...rest } = init ?? {}
    const res = await fetch(url, {
      ...rest,
      method,
      headers,
      signal: controller.signal,
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, status: res.status, body, inconclusive: false }
    }
    return { ok: true, data: body as T, status: res.status }
  } catch (err) {
    if (isAbortError(err) || controller.signal.aborted) {
      return {
        ok: false,
        status: 0,
        body: {
          error: 'asaas_timeout',
          timeoutMs,
          path,
          method,
        },
        inconclusive: true,
      }
    }
    throw err
  } finally {
    clearTimeout(timer)
    if (outer) outer.removeEventListener('abort', onOuterAbort)
  }
}

export function isAsaasInconclusive(result: AsaasApiResult<unknown>): boolean {
  return result.ok === false && result.inconclusive === true
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
