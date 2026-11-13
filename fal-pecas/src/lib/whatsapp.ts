/**
 * Deep links manuais wa.me (contato loja / produto / pedido).
 * CP-NOT N3 (envio transacional automático) = FUTURO — ver
 * docs/planejamento/FAL_SPEC_NOTIFICACOES_WHATSAPP_FUTURO_2026-11-13.md
 */

/** Mensagens WhatsApp contextualizadas (Bloco E). */

export function buildProductWhatsAppMessage(input: {
  name: string
  /** Código referência comercial (preferir commercial_ref). */
  sku: string
  quantity?: number
  productUrl?: string
}): string {
  const lines = [
    'Olá! Gostaria de comprar pela FAL:',
    '',
    `Peça: ${input.name}`,
    `Código referência: ${input.sku}`,
  ]
  if (input.quantity && input.quantity > 0) {
    lines.push(`Quantidade: ${input.quantity}`)
  }
  if (input.productUrl) {
    lines.push('', `Link: ${input.productUrl}`)
  }
  return lines.join('\n')
}

export function buildOrderWhatsAppMessage(input: {
  orderNumber: string
  statusLabel?: string
}): string {
  const lines = [
    'Olá! Quero falar sobre meu pedido na FAL:',
    '',
    `Pedido: ${input.orderNumber}`,
  ]
  if (input.statusLabel) lines.push(`Status: ${input.statusLabel}`)
  return lines.join('\n')
}

export function whatsAppHref(phoneE164Digits: string, message: string): string {
  const phone = phoneE164Digits.replace(/\D/g, '')
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/** Número comercial padrão (env). Sem número, retorna null. */
export function storeWhatsAppPhone(): string | null {
  const raw = import.meta.env.VITE_WHATSAPP_PHONE as string | undefined
  const digits = (raw ?? '').replace(/\D/g, '')
  return digits.length >= 10 ? digits : null
}
