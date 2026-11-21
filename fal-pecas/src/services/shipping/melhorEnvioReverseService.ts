/**
 * Cliente → Edge melhorenvio-reverse (código de devolução ME).
 */
import { getSupabase } from '@/lib/supabase'

export type MeReverseResponse = {
  ok: boolean
  orderId?: string
  occurrenceId?: string
  trackingCode?: string | null
  trackingUrl?: string | null
  expiresAt?: string | null
  protocol?: string | null
  serviceId?: number | null
  amount?: number | null
  message?: string
  error?: string
  sandbox?: boolean
  dryRun?: boolean
  eligible?: boolean
  codeValid?: boolean
  meReverse?: Record<string, unknown> | null
}

function edgeErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const body = data as Record<string, unknown>
  const msg = typeof body.message === 'string' ? body.message.trim() : ''
  const code = typeof body.error === 'string' ? body.error.trim() : ''
  if (msg && code && msg !== code) return `${code}: ${msg}`
  if (msg) return msg
  if (code) return code
  return fallback
}

async function invokeReverse(
  action: 'generate' | 'status',
  orderId: string,
  occurrenceId: string,
  extra?: Record<string, unknown>,
): Promise<MeReverseResponse> {
  const { data, error } = await getSupabase().functions.invoke('melhorenvio-reverse', {
    body: { action, orderId, occurrenceId, ...extra },
  })
  if (error) {
    const fallback = error.message || 'Falha ao chamar melhorenvio-reverse'
    let contextBody: unknown = data
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        contextBody = await ctx.json()
      } catch {
        /* keep data */
      }
    }
    const fromBody = edgeErrorMessage(contextBody, fallback)
    const partial =
      contextBody && typeof contextBody === 'object'
        ? (contextBody as MeReverseResponse)
        : null
    return {
      ...(partial ?? {}),
      ok: false,
      orderId: partial?.orderId ?? orderId,
      occurrenceId: partial?.occurrenceId ?? occurrenceId,
      error: fromBody,
      message: fromBody,
    }
  }
  const body = (data ?? {}) as MeReverseResponse
  return {
    ...body,
    orderId: body.orderId ?? orderId,
    occurrenceId: body.occurrenceId ?? occurrenceId,
    ok: body.ok === true,
  }
}

export function meReverseStatus(orderId: string, occurrenceId: string) {
  return invokeReverse('status', orderId, occurrenceId)
}

export function meReverseGenerate(
  orderId: string,
  occurrenceId: string,
  serviceOverride?: 'pac' | 'sedex' | null,
) {
  return invokeReverse('generate', orderId, occurrenceId, {
    ...(serviceOverride ? { serviceOverride } : {}),
  })
}
