/**
 * Cliente admin → Edges Melhor Envio Sandbox.
 * Tokens ficam só nas Edge Functions (nunca VITE_).
 */
import { getSupabase } from '@/lib/supabase'
import type { MeLabelState, MeShipmentMeta } from '@/lib/melhorEnvioLabelState'

export type MeLabelAction =
  | 'quote'
  | 'prepare'
  | 'purchase'
  | 'generate'
  | 'print'
  | 'tracking'
  | 'status'

export type MeOpsQuoteOption = {
  service_id?: number
  id?: number
  company?: string | null
  name?: string | null
  price?: number
  delivery_time?: string | null
}

export type MeLabelResponse = {
  ok: boolean
  orderId: string
  labelState: MeLabelState
  me?: MeShipmentMeta
  divergence?: {
    chargedShipping: number
    labelAmount: number
    delta: number
    blocked: boolean
    reason?: string
  } | null
  options?: MeOpsQuoteOption[]
  selectedServiceId?: number | null
  printUrl?: string | null
  message?: string
  error?: string
  sandbox?: boolean
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

async function invokeLabel(
  action: MeLabelAction,
  orderId: string,
  extra?: Record<string, unknown>,
): Promise<MeLabelResponse> {
  const { data, error } = await getSupabase().functions.invoke('melhorenvio-label', {
    body: { action, orderId, ...extra },
  })
  if (error) {
    const fallback = error.message || 'Falha ao chamar melhorenvio-label'
    // supabase-js pode colocar o JSON da Edge em error.context (Response) ou em data.
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
      contextBody && typeof contextBody === 'object' ? (contextBody as MeLabelResponse) : null
    return {
      ...(partial ?? {}),
      ok: false,
      orderId: partial?.orderId ?? orderId,
      labelState: partial?.labelState ?? 'none',
      error: fromBody,
      message: fromBody,
    }
  }
  const body = (data ?? {}) as MeLabelResponse
  return {
    ...body,
    orderId: body.orderId ?? orderId,
    labelState: body.labelState ?? 'none',
    ok: body.ok === true,
  }
}

export function meQuoteLabel(
  orderId: string,
  packageOverride?: Record<string, unknown>,
  selectedServiceId?: number | null,
) {
  return invokeLabel('quote', orderId, {
    packageOverride,
    ...(selectedServiceId != null ? { selectedServiceId } : {}),
  })
}

export function mePrepareLabel(orderId: string) {
  return invokeLabel('prepare', orderId)
}

/** Compra explícita — operador deve confirmar na UI. Override de divergência exige reason. */
export function mePurchaseLabel(
  orderId: string,
  confirm: true,
  divergenceOverride?: { confirm: true; reason: string } | null,
) {
  return invokeLabel('purchase', orderId, {
    confirm,
    ...(divergenceOverride ? { divergenceOverride } : {}),
  })
}

export function meGenerateLabel(orderId: string) {
  return invokeLabel('generate', orderId)
}

export function mePrintLabel(orderId: string) {
  return invokeLabel('print', orderId)
}

export function meTrackingLabel(orderId: string) {
  return invokeLabel('tracking', orderId)
}

export function meLabelStatus(orderId: string) {
  return invokeLabel('status', orderId)
}
