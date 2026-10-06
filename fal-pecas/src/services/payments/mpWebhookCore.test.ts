import {
  amountsMatch,
  buildWebhookManifest,
  extractWebhookDataId,
  mapMpProviderStatusToInternal,
  normalizeWebhookDataId,
  parseXSignature,
  verifyMpWebhookSignature,
} from '@/services/payments/mpWebhookCore'
import { describe, expect, it } from 'vitest'

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

  it('verifyMpWebhookSignature OK com HMAC válido', async () => {
    const secret = 'test-secret'
    const dataId = '12345'
    const requestId = 'req-abc'
    const ts = '1704908010'
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
    const v1 = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
    const res = await verifyMpWebhookSignature({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: requestId,
      dataId,
      secret,
    })
    expect(res).toEqual({ ok: true })
  })

  it('verifyMpWebhookSignature rejeita mismatch', async () => {
    const res = await verifyMpWebhookSignature({
      xSignature: 'ts=1,v1=deadbeef',
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
})
