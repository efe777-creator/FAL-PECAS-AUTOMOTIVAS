import { describe, expect, it } from 'vitest'
import {
  buildPostSaleWhatsAppMessage,
  normalizeWhatsAppPhone,
  whatsAppHref,
} from './whatsapp'

describe('normalizeWhatsAppPhone', () => {
  it('prefixa 55 em celular nacional', () => {
    expect(normalizeWhatsAppPhone('11992935688')).toBe('5511992935688')
    expect(normalizeWhatsAppPhone('(11) 99293-5688')).toBe('5511992935688')
  })

  it('mantém E.164 com 55', () => {
    expect(normalizeWhatsAppPhone('5511992935688')).toBe('5511992935688')
  })

  it('rejeita vazio', () => {
    expect(normalizeWhatsAppPhone('')).toBeNull()
    expect(normalizeWhatsAppPhone(null)).toBeNull()
  })
})

describe('buildPostSaleWhatsAppMessage', () => {
  it('monta mensagem de devolução WA com pedido e caso', () => {
    const msg = buildPostSaleWhatsAppMessage({
      orderNumber: 'AB12CD34',
      occurrenceId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      stage: 'autorizada',
      returnMode: 'wa',
      intent: 'devolucao_wa',
    })
    expect(msg).toContain('Pedido: AB12CD34')
    expect(msg).toContain('Caso: aaaaaaaa')
    expect(msg).toContain('Autorizada')
    expect(msg).toContain('WhatsApp / Correios manual')
    expect(msg).toContain('instruções de postagem')
  })

  it('inclui código ME quando houver', () => {
    const msg = buildPostSaleWhatsAppMessage({
      orderNumber: 'ORD1',
      occurrenceId: 'bbbbbbbb',
      returnMode: 'me_codigo',
      trackingCode: 'DRY-REV-123',
      intent: 'duvida_codigo',
    })
    expect(msg).toContain('DRY-REV-123')
    expect(msg).toContain('Já tenho o código')
  })

  it('fora do prazo pede ajuda sem forçar devolução', () => {
    const msg = buildPostSaleWhatsAppMessage({
      orderNumber: 'ORD2',
      intent: 'fora_prazo',
    })
    expect(msg).toContain('prazo de 7 dias')
  })

  it('caso aberto e devolver na loja', () => {
    const aberto = buildPostSaleWhatsAppMessage({
      orderNumber: 'ORD3',
      occurrenceId: 'cccccccc-dddd',
      stage: 'aberto',
      intent: 'caso_aberto',
    })
    expect(aberto).toContain('atendimento')
    expect(aberto).toContain('Caso: cccccccc')

    const loja = buildPostSaleWhatsAppMessage({
      orderNumber: 'ORD4',
      occurrenceId: 'dddddddd',
      returnMode: 'loja',
      stage: 'autorizada',
      intent: 'devolver_loja',
    })
    expect(loja).toContain('Devolver na loja')
    expect(loja).toContain('combinar dia/horário')
  })

  it('dúvida de código sem tracking', () => {
    const msg = buildPostSaleWhatsAppMessage({
      orderNumber: 'ORD5',
      returnMode: 'me_codigo',
      intent: 'duvida_codigo',
    })
    expect(msg).toContain('código Melhor Envio')
  })
})

describe('whatsAppHref', () => {
  it('gera wa.me com texto encoded e 55', () => {
    const href = whatsAppHref('11992935688', 'Olá pedido X')
    expect(href.startsWith('https://wa.me/5511992935688?text=')).toBe(true)
    expect(href).toContain(encodeURIComponent('Olá pedido X'))
  })
})
