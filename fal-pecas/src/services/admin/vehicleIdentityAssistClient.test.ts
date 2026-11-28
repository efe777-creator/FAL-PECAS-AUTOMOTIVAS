import { describe, expect, it } from 'vitest'
import { sanitizeIdentitySuggestion } from '@/services/admin/vehicleIdentityAssistClient'

describe('sanitizeIdentitySuggestion', () => {
  it('aceita campos do contrato e normaliza combustível/tração', () => {
    expect(
      sanitizeIdentitySuggestion({
        model: 'Tiggo 5X',
        engine: '1.5 16V Turbo',
        version: 'TXS',
        fuel: 'flex',
        traction: '4X4',
      }),
    ).toEqual({
      model: 'Tiggo 5X',
      engine: '1.5 16V Turbo',
      version: 'TXS',
      fuel: 'Flex',
      traction: '4x4',
    })
  })

  it('ignora payload vazio ou inválido', () => {
    expect(sanitizeIdentitySuggestion(null)).toBeNull()
    expect(sanitizeIdentitySuggestion({})).toBeNull()
    expect(sanitizeIdentitySuggestion({ model: '  ' })).toBeNull()
  })
})
