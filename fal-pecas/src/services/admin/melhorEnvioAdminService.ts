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
  printUrl?: string | null
  message?: string
  error?: string
  sandbox?: boolean
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
    return {
      ok: false,
      orderId,
      labelState: 'none',
      error: error.message || 'Falha ao chamar melhorenvio-label',
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

export function meQuoteLabel(orderId: string, packageOverride?: Record<string, unknown>) {
  return invokeLabel('quote', orderId, { packageOverride })
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
