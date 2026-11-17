/** Tons semânticos claros (FAL) para badges de etapa/pagamento — alinhados à referência. */

export type OrderTone = 'neutral' | 'warning' | 'info' | 'success' | 'danger' | 'navy'

const TONE_CLASS: Record<OrderTone, string> = {
  neutral: 'border-fal-line bg-fal-bg text-fal-muted',
  warning: 'border-fal-yellow-dark/50 bg-fal-yellow/25 text-fal-navy',
  info: 'border-sky-300 bg-sky-50 text-sky-950',
  success: 'border-green-300 bg-green-50 text-green-950',
  danger: 'border-red-300 bg-red-50 text-red-900',
  navy: 'border-fal-navy/30 bg-fal-navy text-white',
}

export function orderToneClass(tone: OrderTone): string {
  return TONE_CLASS[tone]
}

export function toneForOrderStatus(status: string): OrderTone {
  switch (status) {
    case 'aguardando_pagamento':
      return 'warning'
    case 'pagamento_aprovado':
    case 'recebido':
    case 'em_analise':
    case 'aguardando_decisao':
    case 'aguardando_disponibilidade':
      return 'info'
    case 'confirmado':
    case 'em_separacao':
      return 'navy'
    case 'pronto_para_envio':
    case 'preparando_envio':
    case 'enviado':
    case 'entregue':
      return 'success'
    case 'cancelado':
    case 'expirado':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function toneForPaymentStatus(status: string | null | undefined): OrderTone {
  if (!status) return 'neutral'
  switch (status) {
    case 'approved':
      return 'success'
    case 'pending':
      return 'warning'
    case 'rejected':
    case 'cancelled':
    case 'expired':
      return 'danger'
    case 'refunded':
      return 'info'
    default:
      return 'neutral'
  }
}

export function badgeClass(tone: OrderTone): string {
  return `inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${orderToneClass(tone)}`
}
