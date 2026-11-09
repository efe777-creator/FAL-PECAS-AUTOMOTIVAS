import { describe, expect, it } from 'vitest'
import { classifyMpPublicKey, mpEnvLabel, mpWebhookUrlHint } from '@/lib/mpAdminStatus'

describe('mpAdminStatus', () => {
  it('classifica TEST e APP', () => {
    expect(classifyMpPublicKey('TEST-abc').kind).toBe('test')
    expect(classifyMpPublicKey('APP-xyz').kind).toBe('production')
    expect(classifyMpPublicKey('').kind).toBe('missing')
  })

  it('webhook hint', () => {
    expect(mpWebhookUrlHint('https://abc.supabase.co')).toBe(
      'https://abc.supabase.co/functions/v1/mercado-pago-webhook',
    )
    expect(mpWebhookUrlHint('')).toBeNull()
  })

  it('labels', () => {
    expect(mpEnvLabel('test')).toMatch(/teste/i)
    expect(mpEnvLabel('production')).toMatch(/produção/i)
  })
})
