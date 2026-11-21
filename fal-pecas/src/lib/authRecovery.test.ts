import { afterEach, describe, expect, it, vi } from 'vitest'

describe('authRecovery flags', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('e-mail recovery off por default', async () => {
    vi.stubEnv('VITE_AUTH_EMAIL_RECOVERY', '')
    const { isAuthEmailRecoveryEnabled } = await import('./authRecovery')
    expect(isAuthEmailRecoveryEnabled()).toBe(false)
  })

  it('e-mail recovery on com flag', async () => {
    vi.stubEnv('VITE_AUTH_EMAIL_RECOVERY', '1')
    const { isAuthEmailRecoveryEnabled } = await import('./authRecovery')
    expect(isAuthEmailRecoveryEnabled()).toBe(true)
  })

  it('whatsapp recovery off por default', async () => {
    vi.stubEnv('VITE_AUTH_WHATSAPP_RECOVERY', '')
    const { isAuthWhatsAppRecoveryReady } = await import('./authRecovery')
    expect(isAuthWhatsAppRecoveryReady()).toBe(false)
  })
})
