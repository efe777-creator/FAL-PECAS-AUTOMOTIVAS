/**
 * Deep links manuais wa.me (contato loja / produto / pedido / pós-venda).
 * CP-NOT N3 (envio transacional automático) = FUTURO — ver
 * docs/planejamento/FAL_SPEC_NOTIFICACOES_WHATSAPP_FUTURO_2026-11-13.md
 */

import type { PostSaleReturnMode } from '@/lib/postSaleStages'
import { POST_SALE_RETURN_MODE_LABEL, POST_SALE_STAGE_LABEL, type PostSaleStage } from '@/lib/postSaleStages'

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

export type PostSaleWaIntent =
  | 'geral'
  | 'caso_aberto'
  | 'devolucao_wa'
  | 'devolver_loja'
  | 'duvida_codigo'
  | 'fora_prazo'

/** Mensagens pós-venda tipadas (D18 + fallback). */
export function buildPostSaleWhatsAppMessage(input: {
  orderNumber: string
  occurrenceId?: string | null
  stage?: PostSaleStage | string | null
  returnMode?: PostSaleReturnMode | null
  trackingCode?: string | null
  intent: PostSaleWaIntent
}): string {
  const order = String(input.orderNumber).trim() || '—'
  const caso = input.occurrenceId ? String(input.occurrenceId).slice(0, 8) : null
  const stageLabel =
    input.stage && input.stage in POST_SALE_STAGE_LABEL
      ? POST_SALE_STAGE_LABEL[input.stage as PostSaleStage]
      : input.stage
        ? String(input.stage)
        : null
  const modeLabel = input.returnMode ? POST_SALE_RETURN_MODE_LABEL[input.returnMode] : null

  const header = ['Olá! Preciso de ajuda com pós-venda na FAL:', '', `Pedido: ${order}`]
  if (caso) header.push(`Caso: ${caso}`)
  if (stageLabel) header.push(`Situação: ${stageLabel}`)
  if (modeLabel) header.push(`Modo de devolução: ${modeLabel}`)
  if (input.trackingCode) header.push(`Código de devolução: ${input.trackingCode}`)

  let intentLine = 'Podem me orientar, por favor?'
  switch (input.intent) {
    case 'devolucao_wa':
      intentLine =
        'A loja autorizou devolução pelo WhatsApp/Correios. Preciso das instruções de postagem.'
      break
    case 'devolver_loja':
      intentLine =
        'A loja autorizou devolução na loja. Quero combinar dia/horário para levar a peça.'
      break
    case 'duvida_codigo':
      intentLine = input.trackingCode
        ? 'Já tenho o código de devolução e preciso de orientação para postar nos Correios.'
        : 'Minha devolução foi autorizada com código Melhor Envio e preciso de orientação.'
      break
    case 'fora_prazo':
      intentLine =
        'O prazo de 7 dias no pedido encerrou e ainda preciso de ajuda com este pedido.'
      break
    case 'caso_aberto':
      intentLine = 'Já abri um atendimento neste pedido e quero falar sobre o andamento.'
      break
    default:
      intentLine = 'Quero falar sobre pós-venda / devolução deste pedido.'
  }

  return [...header, '', intentLine].join('\n')
}

/**
 * Normaliza telefone para wa.me (E.164 BR).
 * Aceita 10–11 dígitos nacionais (prefixa 55) ou 12–13 já com país.
 */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length >= 12 && digits.startsWith('55')) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if (digits.length >= 12) return digits
  return null
}

export function whatsAppHref(phoneE164Digits: string, message: string): string {
  const phone = normalizeWhatsAppPhone(phoneE164Digits) ?? phoneE164Digits.replace(/\D/g, '')
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/** Número comercial padrão (env). Sem número, retorna null. */
export function storeWhatsAppPhone(): string | null {
  const raw = import.meta.env.VITE_WHATSAPP_PHONE as string | undefined
  return normalizeWhatsAppPhone(raw)
}
