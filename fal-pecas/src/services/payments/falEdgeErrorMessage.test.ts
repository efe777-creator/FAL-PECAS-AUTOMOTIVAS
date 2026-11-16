import { describe, expect, it } from 'vitest'
import { falEdgeErrorMessage, formatEdgeDetail } from './falEdgeErrorMessage'

describe('formatEdgeDetail', () => {
  it('lê description do payload Asaas', () => {
    expect(
      formatEdgeDetail({
        errors: [
          {
            code: 'invalid_value',
            description: 'O valor mínimo para cobranças via Cartão de Crédito é R$ 5,00.',
          },
        ],
      }),
    ).toBe('O valor mínimo para cobranças via Cartão de Crédito é R$ 5,00.')
  })

  it('aceita string', () => {
    expect(formatEdgeDetail('falha')).toBe('falha')
  })
})

describe('falEdgeErrorMessage', () => {
  it('não mostra [object Object] em asaas_create_failed', () => {
    expect(
      falEdgeErrorMessage(
        {
          error: 'asaas_create_failed',
          detail: {
            errors: [
              {
                code: 'invalid_value',
                description: 'O valor mínimo para cobranças via Cartão de Crédito é R$ 5,00.',
              },
            ],
          },
        },
        'fallback',
      ),
    ).toBe('O valor mínimo para cobranças via Cartão de Crédito é R$ 5,00.')
  })

  it('explica conflito de meio pendente', () => {
    expect(
      falEdgeErrorMessage({ error: 'payment_method_conflict' }, 'fallback'),
    ).toMatch(/outro meio/i)
  })
})
