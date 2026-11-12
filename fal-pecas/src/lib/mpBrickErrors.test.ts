import { describe, expect, it } from 'vitest'
import { mapMpBrickError } from './mpBrickErrors'

describe('mapMpBrickError', () => {
  it('traduz Secure Fields failed', () => {
    const r = mapMpBrickError('The integration with Secure Fields failed')
    expect(r.setupFailed).toBe(true)
    expect(r.userMessage).toMatch(/formulário seguro/i)
    expect(r.userMessage).not.toMatch(/Secure Fields/i)
  })

  it('mantém mensagem humana genérica', () => {
    const r = mapMpBrickError({ message: 'Failed to create card token' })
    expect(r.setupFailed).toBe(false)
    expect(r.userMessage).toMatch(/cartão/i)
  })
})
