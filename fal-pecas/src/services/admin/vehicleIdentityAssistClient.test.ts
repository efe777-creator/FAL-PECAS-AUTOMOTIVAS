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

  it('Dies. vazio no combustível vira Diesel e a IA não troca por Flex', () => {
    const local = refineVehicleIdentityFields({
      model: 'Hilux',
      engine: '2.8',
      version: 'Dies.',
    })
    expect(local.fuel).toBe('Diesel')
    expect(local.version.toLowerCase()).not.toContain('dies')
    expect(
      mergeIdentitySuggestion(local, { fuel: 'Flex' }),
    ).toMatchObject({ fuel: 'Diesel' })
  })

  it('Gás Natural da IA vira GNV quando a linha ainda não tem combustível', () => {
    const local = refineVehicleIdentityFields({ model: 'Grand Siena', engine: '1.4', version: '' })
    expect(
      mergeIdentitySuggestion(local, { fuel: 'Gás Natural' }),
    ).toMatchObject({ fuel: 'GNV' })
  })

  it('ignora payload vazio ou inválido', () => {
    expect(sanitizeIdentitySuggestion(null)).toBeNull()
    expect(sanitizeIdentitySuggestion({})).toBeNull()
    expect(sanitizeIdentitySuggestion({ model: '  ' })).toBeNull()
  })
})
