import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { whatsAppSupportChannel } from './supportChannel'

describe('whatsAppSupportChannel', () => {
  const originalEnv = import.meta.env

  beforeEach(() => {
    vi.stubEnv('VITE_WHATSAPP_PHONE', '5511992935688')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    void originalEnv
  })

  it('exige assunto e mensagem', () => {
    expect(whatsAppSupportChannel.send({ subject: '', message: 'oi' }).ok).toBe(false)
    expect(whatsAppSupportChannel.send({ subject: 'x', message: '' }).ok).toBe(false)
  })

  it('monta href com cliente e pedido', () => {
    const result = whatsAppSupportChannel.send({
      subject: 'Atraso',
      subjectCode: 'atraso',
      orderNumber: 'abc-123',
      message: 'Não chegou',
      customerName: 'Fernando',
      customerEmail: 'f@example.com',
      customerPhone: '11999999999',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const decoded = decodeURIComponent(result.href)
    expect(decoded).toMatch(/Assunto: Atraso/)
    expect(decoded).toMatch(/Código: atraso/)
    expect(decoded).toMatch(/Fernando/)
    expect(decoded).toMatch(/f@example\.com/)
    expect(decoded).toMatch(/Pedido: abc-123/)
    expect(decoded).toMatch(/Não chegou/)
  })
})
