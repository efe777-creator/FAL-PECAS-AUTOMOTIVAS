import { describe, expect, it } from 'vitest'
import {
  classifyMpPublicKey,
  isUsableMpPublicKey,
  mpEnvLabel,
  mpWebhookUrlHint,
} from '@/lib/mpAdminStatus'

describe('mpAdminStatus', () => {
  it('classifica TEST e APP', () => {
    expect(classifyMpPublicKey('TEST-abc').kind).toBe('test')
    expect(classifyMpPublicKey('APP-xyz').kind).toBe('production')
    expect(classifyMpPublicKey('').kind).toBe('missing')
  })

  it('aceita Public Key prod APP_USR-{uuid} e rejeita Access Token longo', () => {
    const pk = 'APP_USR-ae216fe5-5178-4547-a123-26279448096d'
    expect(classifyMpPublicKey(pk).kind).toBe('production')
    expect(isUsableMpPublicKey(pk)).toBe(true)
    const token =
      'APP_USR-8320396999442614-100616-fdd1f8333d9e4a82b0519981a127e2a1-260884404'
    expect(classifyMpPublicKey(token).kind).toBe('invalid')
    expect(isUsableMpPublicKey(token)).toBe(false)
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
    expect(mpEnvLabel('invalid')).toMatch(/Access Token/i)
  })
})
