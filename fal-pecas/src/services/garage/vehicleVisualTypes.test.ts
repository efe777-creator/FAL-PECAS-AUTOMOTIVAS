import { describe, expect, it } from 'vitest'
import {
  normalizeVisualPayload,
  visualSaveCreatesInstallationEvent,
} from './vehicleVisualTypes'

describe('vehicleVisualTypes', () => {
  it('salvar visual nunca cria instalação', () => {
    expect(visualSaveCreatesInstallationEvent()).toBe(false)
  })

  it('normaliza payload inválido sem quebrar', () => {
    const p = normalizeVisualPayload({ bodyColorHex: 'nope', wheelStyle: 'x' })
    expect(p.bodyColorHex).toMatch(/^#/)
    expect(p.wheelStyle).toBe('stock')
  })
})
