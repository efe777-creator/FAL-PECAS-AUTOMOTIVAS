import {
  amountsMatch,
  buildWebhookManifest,
  decideWebhookTransition,
  extractWebhookDataId,
  isWebhookTsFresh,
  mapMpProviderStatusToInternal,
  normalizeWebhookDataId,
  parseXSignature,
  sanitizeWebhookPayload,
  verifyMpWebhookSignature,
} from '@/services/payments/mpWebhookCore'
import { describe, expect, it } from 'vitest'

async function sign(secret: string, dataId: string, requestId: string, ts: string) {
  const manifest = buildWebhookManifest({ dataId, requestId, ts })
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(manifest))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

describe('mpWebhookCore', () => {
  it('parseXSignature extrai ts e v1', () => {
    expect(
      parseXSignature(
        'ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839',
      ),
    ).toEqual({
      ts: '1704908010',
      v1: '618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839',
    })
  })

  it('normalizeWebhookDataId lowercases alfanumérico', () => {
    expect(normalizeWebhookDataId('AbC123')).toBe('abc123')
    expect(normalizeWebhookDataId('123-456')).toBe('123-456')
  })

  it('buildWebhookManifest formato MP', () => {
    expect(
      buildWebhookManifest({ dataId: 'ABC', requestId: 'req-1', ts: '100' }),
    ).toBe('id:abc;request-id:req-1;ts:100;')
  })

  it('verifyMpWebhookSignature OK com HMAC válido e ts fresco', async () => {
    const secret = 'test-secret'
    const dataId = '12345'
    const requestId = 'req-abc'
    const ts = String(Math.floor(Date.now() / 1000))
    const v1 = await sign(secret, dataId, requestId, ts)
    const res = await verifyMpWebhookSignature({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: requestId,
      dataId,
      secret,
    })
    expect(res).toEqual({ ok: true })
  })

  it('verifyMpWebhookSignature rejeita ts stale', async () => {
    const secret = 'test-secret'
    const dataId = '12345'
    const requestId = 'req-abc'
    const ts = '1704908010'
    const v1 = await sign(secret, dataId, requestId, ts)
    const res = await verifyMpWebhookSignature({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: requestId,
      dataId,
      secret,
    })
    expect(res).toEqual({ ok: false, reason: 'signature_ts_stale' })
  })

  it('verifyMpWebhookSignature rejeita mismatch', async () => {
    const res = await verifyMpWebhookSignature({
      xSignature: `ts=${Math.floor(Date.now() / 1000)},v1=deadbeef`,
      xRequestId: 'r',
      dataId: '1',
      secret: 's',
    })
    expect(res.ok).toBe(false)
  })

  it('verifyMpWebhookSignature secret ausente', async () => {
    const res = await verifyMpWebhookSignature({
      xSignature: 'ts=1,v1=a',
      xRequestId: 'r',
      dataId: '1',
      secret: undefined,
    })
    expect(res).toEqual({ ok: false, reason: 'MP_WEBHOOK_SECRET missing' })
  })

  it('mapMpProviderStatusToInternal', () => {
    expect(mapMpProviderStatusToInternal('approved')).toBe('approved')
    expect(mapMpProviderStatusToInternal('rejected')).toBe('rejected')
    expect(mapMpProviderStatusToInternal('pending')).toBe('pending')
    expect(mapMpProviderStatusToInternal('in_process')).toBe('pending')
    expect(mapMpProviderStatusToInternal('expired')).toBe('expired')
  })

  it('amountsMatch', () => {
    expect(amountsMatch(10.5, 10.5)).toBe(true)
    expect(amountsMatch(10.5, 10.51)).toBe(true)
    expect(amountsMatch(10.5, 11)).toBe(false)
  })

  it('extractWebhookDataId query e body', () => {
    expect(extractWebhookDataId(new URLSearchParams('data.id=99'), null)).toBe('99')
    expect(extractWebhookDataId(new URLSearchParams(), { data: { id: 77 } })).toBe('77')
  })

  it('decideWebhookTransition — approved prevalece', () => {
    expect(
      decideWebhookTransition({ currentPaymentStatus: 'approved', incomingInternal: 'rejected' }),
    ).toEqual({ action: 'noop', reason: 'already_approved' })
    expect(
      decideWebhookTransition({ currentPaymentStatus: 'pending', incomingInternal: 'approved' }),
    ).toEqual({ action: 'approve', reason: 'approve_from_pending' })
    expect(
      decideWebhookTransition({ currentPaymentStatus: 'pending', incomingInternal: 'rejected' }),
    ).toEqual({ action: 'set_terminal', reason: 'set_rejected' })
    expect(
      decideWebhookTransition({ currentPaymentStatus: 'pending', incomingInternal: 'pending' }),
    ).toEqual({ action: 'noop', reason: 'still_pending' })
  })

  it('sanitizeWebhookPayload redige token/cvv', () => {
    expect(
      sanitizeWebhookPayload({ token: 'abc', status: 'approved', nested: { cvv: '123' } }),
    ).toEqual({ token: '[redacted]', status: 'approved', nested: { cvv: '[redacted]' } })
  })

  it('isWebhookTsFresh', () => {
    const now = 1_700_000_000
    expect(isWebhookTsFresh(String(now), now, 600)).toBe(true)
    expect(isWebhookTsFresh(String(now - 601), now, 600)).toBe(false)
  })
})
