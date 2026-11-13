import { describe, expect, it } from 'vitest'
import { classifyAnalysisItems, defaultProposalText } from './orderAnalysisResolution'

describe('classifyAnalysisItems', () => {
  it('incomplete when any availability missing', () => {
    expect(
      classifyAnalysisItems([
        { availability: 'disponivel' },
        { availability: null },
      ]),
    ).toBe('incomplete')
  })

  it('all_ok when all disponivel', () => {
    expect(
      classifyAnalysisItems([
        { availability: 'disponivel' },
        { availability: 'disponivel' },
      ]),
    ).toBe('all_ok')
  })

  it('prazo_only without unavailable', () => {
    expect(
      classifyAnalysisItems([
        { availability: 'disponivel' },
        { availability: 'disponivel_com_prazo', leadDays: 5 },
      ]),
    ).toBe('prazo_only')
  })

  it('has_unavailable wins over prazo', () => {
    expect(
      classifyAnalysisItems([
        { availability: 'indisponivel' },
        { availability: 'disponivel_com_prazo', leadDays: 3 },
      ]),
    ).toBe('has_unavailable')
  })
})

describe('defaultProposalText', () => {
  it('parcial mentions refund manual', () => {
    const t = defaultProposalText('parcial', { unavailableNames: ['Filtro'] })
    expect(t).toContain('Filtro')
    expect(t.toLowerCase()).toContain('estorno')
  })
})
