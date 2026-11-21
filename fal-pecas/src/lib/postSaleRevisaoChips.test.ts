import { describe, expect, it } from 'vitest'
import { revisaoChipForRow, rowMatchesRevisaoChip } from './postSaleRevisaoChips'

describe('postSaleRevisaoChips', () => {
  it('mapeia tipos pos_venda', () => {
    expect(
      revisaoChipForRow({ source: 'occurrence', tipo: 'pos_venda_devolucao' }),
    ).toBe('devolucao')
    expect(
      revisaoChipForRow({ source: 'occurrence', tipo: 'pos_venda_incompat' }),
    ).toBe('devolucao')
    expect(
      revisaoChipForRow({ source: 'occurrence', tipo: 'pos_venda_suporte' }),
    ).toBe('suporte')
    expect(revisaoChipForRow({ source: 'occurrence', tipo: 'pos_entrega' })).toBe(
      'suporte',
    )
    expect(revisaoChipForRow({ source: 'manual_review' })).toBe('aguardando')
  })

  it('filtra chips', () => {
    const row = { source: 'occurrence' as const, tipo: 'pos_venda_devolucao' }
    expect(rowMatchesRevisaoChip('todas', row)).toBe(true)
    expect(rowMatchesRevisaoChip('devolucao', row)).toBe(true)
    expect(rowMatchesRevisaoChip('suporte', row)).toBe(false)
  })
})
