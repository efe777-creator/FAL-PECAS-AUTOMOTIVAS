import { describe, expect, it } from 'vitest'
import { trustIsVerified, trustLabel } from './professionalTrust'

describe('professionalTrust', () => {
  it('rótulos honestos sem medalha', () => {
    expect(trustLabel(1)).toBe('Perfil cadastrado')
    expect(trustLabel(5)).toBe('Histórico profissional na FAL')
  })

  it('nível 1 não é verificado', () => {
    expect(trustIsVerified(1)).toBe(false)
    expect(trustIsVerified(2)).toBe(true)
  })
})
