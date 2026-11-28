import { describe, expect, it } from 'vitest'
import {
  mergeIdentitySuggestion,
  refineVehicleIdentityFields,
  sanitizeIdentitySuggestion,
} from '@/services/admin/vehicleIdentityAssistClient'

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

  it('Tera High + versão 170 vai para Highline e para o motor', () => {
    expect(
      refineVehicleIdentityFields({
        model: 'Tera High',
        engine: '1.0 12V TSI',
        version: '170',
        fuel: 'flex',
      }),
    ).toEqual({
      model: 'Tera',
      engine: '1.0 12V 170 TSI',
      version: 'Highline',
      fuel: 'Flex',
      traction: '',
    })
  })

  it('a IA não desfaz Highline nem devolve o 170 para a versão', () => {
    const local = refineVehicleIdentityFields({
      model: 'Tera High',
      engine: '1.0 12V TSI',
      version: '170',
    })
    expect(
      mergeIdentitySuggestion(local, {
        model: 'Tera High',
        engine: '1.0 12V TSI',
        version: '170',
        fuel: 'Flex',
      }),
    ).toMatchObject({
      model: 'Tera',
      engine: '1.0 12V 170 TSI',
      version: 'Highline',
      fuel: 'Flex',
    })
  })

  it('ignora payload vazio ou inválido', () => {
    expect(sanitizeIdentitySuggestion(null)).toBeNull()
    expect(sanitizeIdentitySuggestion({})).toBeNull()
    expect(sanitizeIdentitySuggestion({ model: '  ' })).toBeNull()
  })
})
