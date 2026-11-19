/** Tons semânticos para badges de etapa/pagamento — legíveis em light e dark. */

export type OrderTone = 'neutral' | 'warning' | 'info' | 'success' | 'danger' | 'navy'

const TONE_CLASS: Record<OrderTone, string> = {
  neutral: 'border-fal-line bg-fal-surface-2 text-fal-muted',
  warning: 'border-fal-yellow-dark/60 bg-fal-yellow/40 text-fal-fg',
  info: 'border-fal-accent/40 bg-fal-accent/15 text-fal-fg',
  success: 'border-fal-success/40 bg-fal-success/15 text-fal-fg',
  danger: 'border-fal-danger/40 bg-fal-danger/15 text-fal-fg',
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
