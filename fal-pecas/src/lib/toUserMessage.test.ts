import { describe, expect, it } from 'vitest'
import { toUserMessage } from './toUserMessage'

describe('toUserMessage', () => {
  it('traduz credenciais inválidas', () => {
    expect(toUserMessage(new Error('Invalid login credentials'))).toBe(
      'E-mail ou senha incorretos.',
    )
  })

  it('evita [object Object]', () => {
    expect(toUserMessage({})).toBe('Algo deu errado. Tente novamente.')
    expect(toUserMessage('[object Object]')).toBe('Algo deu errado. Tente novamente.')
  })

  it('usa message de objeto supabase-like', () => {
    expect(toUserMessage({ message: 'User already registered' })).toBe(
      'Este e-mail já está cadastrado. Faça login ou recupere a senha.',
    )
  })

  it('explica conflito de chave natural de VV', () => {
    expect(
      toUserMessage(
        new Error(
          'duplicate key value violates unique constraint "vehicle_versions_natural_uidx"',
        ),
      ),
    ).toMatch(/mesmo ano, motor e versão/i)
  })
})
