/**
 * Canal de atendimento da Central — adapter desacoplado (hoje: WhatsApp).
 * Trocar implementação sem reescrever o formulário de /suporte.
 */

import { storeWhatsAppPhone, whatsAppHref } from '@/lib/whatsapp'

export type SupportFormInput = {
  subject: string
  subjectCode?: string
  orderNumber?: string
  message: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
}

export type SupportChannelResult =
  | { ok: true; href: string }
  | { ok: false; error: string }

export interface SupportChannel {
  send(input: SupportFormInput): SupportChannelResult
}

function buildSupportWhatsAppMessage(input: SupportFormInput): string {
  const lines = [
    'Olá! Contato pela Central de Suporte da FAL:',
    '',
    `Assunto: ${input.subject.trim()}`,
  ]
  if (input.subjectCode?.trim()) {
    lines.push(`Código: ${input.subjectCode.trim()}`)
  }
  const name = input.customerName?.trim()
  const email = input.customerEmail?.trim()
  const phone = input.customerPhone?.trim()
  if (name || email || phone) {
    lines.push('')
    lines.push('Cliente:')
    if (name) lines.push(`- Nome: ${name}`)
    if (email) lines.push(`- E-mail: ${email}`)
    if (phone) lines.push(`- WhatsApp: ${phone}`)
  }
  const order = input.orderNumber?.trim()
  if (order) lines.push('', `Pedido: ${order}`)
  lines.push('', input.message.trim())
  return lines.join('\n')
}

export const whatsAppSupportChannel: SupportChannel = {
  send(input) {
    const subject = input.subject.trim()
    const message = input.message.trim()
    if (!subject) return { ok: false, error: 'Informe o assunto.' }
    if (!message) return { ok: false, error: 'Descreva sua mensagem.' }
    const phone = storeWhatsAppPhone()
    if (!phone) {
      return {
        ok: false,
        error: 'WhatsApp da loja indisponível no momento. Tente pelo e-mail do rodapé.',
      }
    }
    return { ok: true, href: whatsAppHref(phone, buildSupportWhatsAppMessage(input)) }
  },
}

/** Adapter ativo da Central (MVP). */
export const activeSupportChannel: SupportChannel = whatsAppSupportChannel
