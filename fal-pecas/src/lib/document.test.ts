import { describe, expect, it } from 'vitest'
import { formatCpfOrCnpjMask } from '@/lib/document'

describe('formatCpfOrCnpjMask', () => {
  it('formata CPF até 11 dígitos', () => {
    expect(formatCpfOrCnpjMask('52998224725')).toBe('529.982.247-25')
  })

  it('formata CNPJ acima de 11 dígitos', () => {
    expect(formatCpfOrCnpjMask('11222333000181')).toBe('11.222.333/0001-81')
  })
})
